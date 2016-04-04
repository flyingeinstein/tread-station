#!/usr/bin/nodejs

var bbbPWM = require('./bbb-pwm');
var DateJS = require('./node_modules/datejs');
var Aggregate = require('./aggregate');
var glob = require("glob");
var exec = require('child_process').exec;

// find the OCP PWM module as it's very nomadic
var ocp_root = null, pwm_endpoint = null;
var files = glob.sync("/sys/devices/ocp.?");
if(files.length>1) {
	console.log("found too many potential OCP folders:");
	files.forEach(function(item) { console.log("  : "+item); });
} else if(files.length==1) {
	ocp_root = files[0];
	console.log("found OCP root at "+ocp_root);

	// found OCP root, now find the PWM module
	files = glob.sync(ocp_root+"/pwm_test_P8_13*");
	if(files.length>1) {
		console.log("found too many potential PWM endpoints for P8:13:");
		files.forEach(function(item) { console.log("  : "+item); });
	} else if(files.length==1) {
		pwm_endpoint = files[0]+'/';
		console.log("found PWM P8:13 endpoint at "+pwm_endpoint);
	}
}
if(!pwm_endpoint) console.log("failed to find the PWM P8:13 endpoint in /sys/devices/ocp.?/pwm_test_P8_13.??");

// instantiate the Web Service
var WebSocketServer = require('websocket').server;
var http = require('http');

// connect to the database
var mysql      = require('mysql');
var mysqlDateFormat = "yyyy-MM-dd HH:mm:ss";
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'tread',
  password : 'peps1c0la',
  database : 'treadstation'
});


var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
});
server.listen(27001, function() { });

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
    treadmill.acceptConnection(request);
});

function isNumber(n)
{
    return typeof n == 'number' && !isNaN(n) && isFinite(n);
}

function clamp(value, minV, maxV)
{
    value = Number(value);
    if(value < minV)
        return minV;
    else if(value > maxV)
        return maxV;
    else
        return value;
}

function Treadmill()
{
    this.currentSpeed = 0;
    this.desiredSpeed = 0;
    this.speedMeasured = 0;
    this.accelleration = 1;

    // usually root owns the pwm device, we want to take ownership
    // current user must be in the /etc/sudoers file with NOPASSWD needed
    this.takeOwnershipOfDevice(pwm_endpoint);

    // Instantiate bbbPWM object to control PWM device.  Pass in device path
    // and the period to the constructor.
    this.pwm = new bbbPWM(pwm_endpoint, 50000000);

    this.currentIncline = 0;
    this.desiredIncline = 0;

    // sensors
    this.heartrate = 0;

    // limits - in native format
    this.speedIncrement = this.MPHtoNative(0.1);
    this.minSpeed = 90; // this is a built in limit of the speed controller
    this.maxSpeed = this.MPHtoNative(8.0);

    this.inclineIncrement = this.inclineGradeToNative(1);
    this.minIncline = this.inclineGradeToNative(0);
    this.maxIncline = this.inclineGradeToNative(50);

    // variables
    this.runningTime = 0;       // total running millis (accumulates start/stops until a reset)
    this.runningSince = null;   // Date that we started running (non stop)
    this.distance = 0;
    
    // goals
    this.track = {
        id: 0,
        laps: 0
    };
    this.goals = {
        time : 90*60,       // default to 90 minutes
        distance : null
    };

    // metrics
    this.metrics = {
        mets : new Aggregate(0),
        speed : new Aggregate(0),
        incline : new Aggregate(0)
    };


    this.active = false;

    // internals
    this.connection = null;
    this.__updateInterval = null;

    // connect to mysql
    this.db = db;
    this.db.connect();
    this.loadSystem();

    // session
    this.session = {
        id: null,
        user: null,
        recording: false
    };

    this.pwm.turnOff();
    this.pwm.polarity(0);

    this.init_screensaver();

    console.log("Treadmill ready");

    var _treadmill = this;
}

Treadmill.prototype.takeOwnershipOfDevice = function(device_path)
{
    exec("sudo chown -R $USER "+device_path, function(error,stdout, stderr) {
        if(error) {
            ss.enabled = false;
            console.log("failed to take ownership of "+device_path+", error "+error);
            console.log(stdout);
            console.log("errors:");
            console.log(stderr);
        }
    });
}

Treadmill.prototype.loadSystem = function()
{
    // load users
    var treadmill = this;
    var users = this.users = new Array();
    this.db.query('SELECT * FROM users') 
        .on('result', function(row) {
            users[row.userid] = row;
            //if(treadmill.session.user==null)
            //    treadmill.setUser(row);
            console.log(row);
        });
}

Treadmill.prototype.setUser = function(user, weight)
{
    if(!user)
        return;
    else if(user.userid==null)
    {
        if(isNaN(user))
        {
            for(var u in this.users)
            {
                if(users[u].name == user) {
                    user = users[u];
                    break;
                }
            }
        } else
            user = this.users[ Number(user) ];
    }
    console.log("selecting user "+user.name);
    this.reset();
    this.session.user = user;
    if(user.goaltime!=null)
        this.goaltime=user.goaltime;
    if(user.goaldistance!=null)
        this.goaldistance=user.goaldistance;
    // notify the interface
    if(this.connection)
        this.connection.sendUTF(JSON.stringify({ type:'response', schema:'user', response: (this.session!=null) ? this.session.user : null }));
    if(weight!=null) {
        this.updateWeight(weight);
    }
}

Treadmill.prototype.updateWeight = function(weight)
{
    if(weight!=null && weight>0 && this.db!=null && this.session && this.session.user && this.session.user.userid>0) {
        var _treadmill = this;
        this.db.query("insert into weight(userid, ts, weight) values (?,unix_timestamp(),?);", [this.session.user.userid, weight])
            .on('end', function() {
                // if log succeeds, then update user account
                console.log("recorded weight "+weight);
                _treadmill.db.query("update users set weight=? where userid=?;", 
                    [weight, _treadmill.session.user.userid]);
                _treadmill.session.user.weight = weight;
                console.log(_treadmill.users[ _treadmill.session.user.userid ].weight);
                _treadmill.connection.sendUTF(JSON.stringify({ type:'response', schema:'user', response: _treadmill.session.user }));
            });
    }
}

Treadmill.prototype.MPHtoNative = function(value) 
{
    // 90 is 2mph, 150 is 3.4mph, 250 is 6mph
    return Number(value) * 45;
}

Treadmill.prototype.nativeToMPH = function(value) 
{
    return Number(value) / 45;
}

Treadmill.prototype.init_screensaver = function(action) 
{
    this.screensaver = {
        // config/settings
        enabled: true,
        display: ":0.0",
        error: 0,

        // internal variables
        lastReset: new Date(),

        // screensaver functions
        enable: function() { this.set("on"); },
        disable: function() { this.set("off"); },
        activate: function() { this.set("activate"); },
        blank: function() { this.set("blank"); },
        reset: function() { this.set("reset"); this.lastReset=new Date(); },
        timeout: function(secs) { this.set(""+secs); },

        // main set() function calls command "xset s <action>"
        set: function(action) {
            if(!this.enabled) return false;
            var ss = this;
            exec("DISPLAY="+this.display+" xset s "+action, function(error,stdout, stderr) {
                if(error) {
                    if(ss.error++ >10) {
                        ss.enabled=false;
                    }
                    console.log("xset error "+error);
                    console.log(stdout);
                    console.log("errors:");
                    console.log(stderr);
                }
            });
        }
    };

    // initialize the screensaver
    var ss = this.screensaver;
    exec("./screensaver.conf "+this.screensaver.display, function(error,stdout, stderr) {
        if(error) {
            ss.enabled = false;
            console.log("screensaver.conf error "+error);
            console.log(stdout);
            console.log("errors:");
            console.log(stderr);
        }
    });

    this.screensaver.enable();
}

Treadmill.prototype.inclineGradeToNative = function(value) 
{
    return Number(value);
}

Treadmill.prototype.nativeToInclineGrade = function(value) 
{
    return Number(value);
}

Treadmill.prototype.speed = function(value) 
{
    var was_active = this.active;

    // TODO: The accelleration verbs
    if(value=="STOP") {
        this.stop();
    } else if(value=="PANIC" || value=="ESTOP") {
        this.fullstop();
    } else if(value=="START") {
	return this.speed("2.0");
    } else if(value=="++") {
        this.active = true;
        this.desiredSpeed += this.speedIncrement;
    } else if(value=="--") {
        this.active = true;
        this.desiredSpeed -= this.speedIncrement;
    } else if(!isNaN(value)) {
        // startup if stopped
        this.active = true;
        this.desiredSpeed = clamp( this.MPHtoNative(Number(value)), this.minSpeed, this.maxSpeed);
    }

    // check limits
    if(this.desiredSpeed>this.maxSpeed)
        this.desiredSpeed=this.maxSpeed;
    else if(this.desiredSpeed<this.minSpeed && this.desiredSpeed>0)
        this.desiredSpeed=this.minSpeed;

    // start to accellerate or deccellerate
    if(this.currentSpeed < this.desiredSpeed)
        this.accellerate();
    else if(this.currentSpeed > this.desiredSpeed)
        this.deccellerate();

    // update the PWM
    this.pwm.setDuty(this.currentSpeed*100);
    if(!was_active && this.active) {
    	this.pwm.turnOn();
	    this.sendEvent("running");
    }
}

Treadmill.prototype.incline = function(value)
{
    if(value=="++") {
        this.desiredIncline += this.inclineIncrement;
    } else if(value=="--") {
        this.desiredIncline -= this.inclineIncrement;
    } else if(value=="FLOOR") {
        this.desiredIncline = this.minIncline;
    } else if(!isNaN(value)) {
        value = clamp(Number(value), this.minIncline, this.maxIncline);
    }

    // TODO: do something here to make the incline change
}

Treadmill.prototype.accellerate = function()
{
    if(this.currentSpeed != this.desiredSpeed) {
        this.currentSpeed += this.accelleration;
        if(this.currentSpeed < this.minSpeed)
            this.currentSpeed = this.minSpeed;

        if(this.currentSpeed > this.maxSpeed)
            this.currentSpeed = this.maxSpeed;
        else if(this.currentSpeed > this.desiredSpeed)
            this.currentSpeed = this.desiredSpeed;
        else {
            var _treadmill = this;
            setTimeout(function() { _treadmill.accellerate(); }, 100);
        }
    	this.pwm.setDuty(this.currentSpeed*100);
    }
    this.sendStatus();
}

Treadmill.prototype.deccellerate = function()
{
    if(this.currentSpeed != this.desiredSpeed) {
        this.currentSpeed -= this.accelleration;
        if(this.currentSpeed<this.minSpeed) {
            // we've stopped
            this.fullstop();
        } else if(this.currentSpeed < this.desiredSpeed)
            this.currentSpeed = this.desiredSpeed;
        else {
            var _treadmill = this;
            setTimeout(function() { _treadmill.deccellerate(); }, 100);
        }
    	this.pwm.setDuty(this.currentSpeed*100);
    }
    this.sendStatus();
}

Treadmill.prototype.stop = function()
{
    if(this.desiredSpeed!=0) {
        this.desiredSpeed=0;
        this.sendEvent("stopping");
        if(this.currentSpeed==0) {
            this.sendEvent("stopped");
            this.updateStatus();
        }
    }
}

Treadmill.prototype.fullstop = function()
{
    this.active = false;
    this.pwm.turnOff();
    this.desiredSpeed=0;
    this.currentSpeed=0;
    this.sendEvent("stopped");
    this.updateStatus();
}

Treadmill.prototype.reset = function()
{
     this.stop();
     this.runningSince=null;
     this.runningTime = 0;
     this.session.id = null;    // session begins when user starts treadmill again
     this.sendStatus();
}

Treadmill.prototype.updateStatus = function()
{
    var now = new Date();

    // if we are starting or stopping, then start our running timer
    if(!this.active && this.runningSince!=null) {
        // we are stopping, add latest runtime to accumulated total
        this.runningTime += new Date().valueOf() - this.runningSince.valueOf();
        this.runningSince = null;
    } else if(this.active && this.runningSince==null) {
        // we are starting up, could be a new session or a continuation of an existing session
        if(this.session.id==null) {
            // new session
            this.runningSince = new Date();
            this.session.id = this.runningSince.unix_timestamp();
        } else {
            this.runningSince = new Date();
        }
    } 

    // HACK: make the incline move for now
    if(this.desiredIncline != this.currentIncline) {
        if(this.currentIncline < this.desiredIncline)
            this.currentIncline += this.inclineIncrement;
        else
            this.currentIncline -= this.inclineIncrement;
    }

    // every 10 seconds reset the screensaver so it doesnt activate
    var secsSinceReset = (now - this.screensaver.lastReset)/1000;
    if(this.active && secsSinceReset>10) {
        console.log("resetting screensaver");
        this.screensaver.reset();
    }
}

Treadmill.prototype.getTotalRunningMillis = function()
{
    return (this.runningSince!=null)
        ? this.runningTime + (new Date().valueOf() - this.runningSince.valueOf())
        : this.runningTime;
}

Treadmill.prototype.sendStatus = function()
{
    this.updateStatus();
    try {
        // update clients
        if(this.connection) {
            this.connection.sendUTF(JSON.stringify({
                type: 'status', 
                timestamp: new Date(),
                active: this.active,
                runningTime: this.getTotalRunningMillis(),
                currentSpeed: this.nativeToMPH(this.currentSpeed),
                desiredSpeed: this.nativeToMPH(this.desiredSpeed),
                currentIncline: this.nativeToInclineGrade(this.currentIncline),
                desiredIncline: this.nativeToInclineGrade(this.desiredIncline)
            }));
        }
        this.updateMysqlStatus();
    } catch(ex) {
        console.log("warning: failed to transmit status, likely connection error, aborting connection.");
        this.abortConnection();
    }
}

Treadmill.prototype.updateMysqlStatus = function()
{
    try {
        if(this.db && this.session && this.session.id && this.session.user && this.runningSince) {
            var treadmill = this;
            var _lastUpdate = new Date().unix_timestamp();
            var _runningSince = this.runningSince.unix_timestamp();
            var _runningTime = (new Date().valueOf() - this.runningSince.valueOf())/1000;
            this.db.query("insert into runs(session,user,ts,track,laps,lastupdate,runningTime) values (?,?,?,?,?,?,?) on duplicate key update lastupdate=?, runningTime=?, laps=?;", [
                    this.session.id, this.session.user.userid, _runningSince, this.track.id, this.track.laps, _lastUpdate, _runningTime,  // insert values
                    _lastUpdate, _runningTime, this.track.laps])    // update values
                .on('error', function(err) {
                        treadmill.session.recording = false;
                        console.log(err);
                })
                .on('end', function() { treadmill.session.recording=true; });
        } else {
            this.session.recording = false;
        }
    } catch(ex) {
        console.log("warning: failed to send to mysql : "+ex);
        this.abortConnection();
    }
}

Treadmill.prototype.sendEvent = function(_name, _data)
{
	try {
            if(this.connection) {
                this.connection.sendUTF(JSON.stringify({
                    type: 'event', 
		    name: _name,
		    data: _data
                }));
	    }
	} catch(ex) {
        	console.log("warning: failed to transmit event, likely connection error, aborting connection.");
        	//this.abortConnection();
	}
}


Treadmill.prototype.abortConnection = function()
{
    if(this.connection) {
        this.connection.close();
        this.connection = null;
    }
    this.speed("STOP");
    if(this.__updateInterval) {
        clearInterval(_treadmill.__updateInterval);
        this.__updateInterval = null;
    }
}

Treadmill.prototype.acceptConnection = function(request)
{
    // close any existing connection
    if(this.connection!=null)
      this.connection.close();

    // accept the new one
    this.connection = request.accept(null, request.origin);
    console.log("connection from host:"+request.host+"   origin:"+request.origin);

    // startup a thread to send status every 1 second
    this.__updateInterval = setInterval(function(a) { if(a.connection) a.sendStatus() }, 500, this);

    var _treadmill = this;

    // This is the most important callback for us, we'll handle
    // all messages from users here.
    this.connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var msg = JSON.parse(message.utf8Data);
            if(msg.Speed)
                _treadmill.speed(msg.Speed);
            else if(msg.Incline)
                _treadmill.incline(msg.Incline);
            else if(msg.Reset)
                _treadmill.reset();
            else if(msg.User)
                _treadmill.setUser(msg.User, msg.Weight);
            else if(msg.Get) {
                try {
                    console.log("request for schema "+msg.Get);
                    var data;
                    if(msg.Get=='users')
                        data = _treadmill.users;
                    else if(msg.Get=='user')
                        data = (_treadmill.session!=null) ? _treadmill.session.user : null;
                    else if(msg.Get=='metrics')
                        data = _treadmill.metrics;

                    // send the reply
                    _treadmill.connection.sendUTF(JSON.stringify({ type:'response', schema:msg.Get, response: data }));
                } catch(ex) {
                    console.log("failed to send '"+msg.Get+"' : "+ex);
                }
            }
        }
    });

    this.connection.on('close', function(connection) {
        // close user connection
	    console.log("closed");
        _treadmill.speed("STOP");
        clearInterval(_treadmill.__updateInterval);
        _treadmill.__updateInterval = null;
        _treadmill.connection = null;
    });


}

Date.prototype.mysql = function()
{
    return this.toString(mysqlDateFormat);
}

Date.prototype.unix_timestamp = function()
{
    return Math.floor(this.getTime()/1000);
}

// ensure we have all config
var treadmill;
if(!ocp_root || !pwm_endpoint) {
	setTimeout(function () { process.exit(5); }, 100);
} else {
  treadmill = new Treadmill();
}


