
process.on('SIGINT', function() {
    console.trace("Caught interrupt signal");
    process.exit();
});

var fs = require('fs');
var DateJS = require('./node_modules/datejs');
const http = require('http');
const WebSocketServer = require('websocket').server;

const DriverTree = require('./drivers/drivertree');

const DataModel = require("./datamodel");


// this class handles finding javascript drivers for PWM, sensors and other hardware
var drivers = new DriverTree();


function isNumber(n)
{
    return typeof n === 'number' && !isNaN(n) && isFinite(n);
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

class DisabledFeature
{
    constructor(name) {
        this.name = name;
    }

    action() {
        console.log("feature "+name+" not enabled");
    }
}

function Treadmill()
{

    // check if we are running in simulation mode
    //var simfile = fs.lstatSync('/etc/treadmill/simulate');
    if(1) { //simfile.isFile()) {
        this.simulation = {
            active: true,
            autopace: false
        };
    }

    if(!drivers) { this.fatal("internal error: no driver tree"); }
    this.controlpanel = drivers.$("user/experience/treadmill");
    if(!this.controlpanel) { this.fatal("internal error: no treadmill user control driver found"); }
    this.controlpanel.onUpdate = function(status){ this.sendStatus(status); }.bind(this);
    this.controlpanel.onEvent = function(e){ this.sendEvent(e); }.bind(this);

    // for now, no autopace feature
    this.autopace = new DisabledFeature("autopace");

    this.active = false;

    // internals
    this.connection = null;
    this.__updateInterval = null;
    this.__updateInterval = null;

    console.log("Treadmill ready");





    // instantiate the Web Service
    this.server = http.createServer(function(request, response) {
        // process HTTP request. Since we're writing just WebSockets server
        // we don't have to implement anything.
    });
    this.server.listen(27001, function() { });

// create the server
    this.wsServer = new WebSocketServer({
        httpServer: this.server
    });

// WebSocket server
    this.wsServer.on('request', function(request) {
        this.acceptConnection(request);
    }.bind(this));


    /*const WebSocket = require('ws');

    const server = new WebSocket.Server({
            port: 8080
        });
    */

}

// collection of algorithms
// allows us to more dynamically support various algorithms based on detected sensors or particular implementations
Treadmill.prototype.algorithms = [];


Treadmill.prototype.fatal = function(error) {
    console.log(error);
    process.exit();
};




Treadmill.prototype.updateWeight = function(weight)
{
    if(this.datamodel && this.session && this.session.user)
        this.datamodel.updateWeight(this.session.user, weight);
};


Treadmill.prototype.sendStatus = function(status)
{
    try {
        // update clients
        if(this.connection) {
            this.connection.sendUTF(JSON.stringify(status));
        } else if (this.simulate) {
            console.log(status);
        }
        this.updateMysqlStatus();
    } catch(ex) {
        console.log("warning: failed to transmit status, likely connection error, aborting connection.", ex);
        console.log("status object was ", status);
        this.abortConnection();
    }
};

Treadmill.prototype.sendEvent = function(_name, _data)
{
    try {
        console.log(_name, _data);
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
};


Treadmill.prototype.readSensors = function()
{
    this.readSensor(this.sensors.sonar);
};

Treadmill.prototype.parseMessage = function(message) {
        var _treadmill = this;
        if (message.type === 'utf8') {
            var msg = JSON.parse(message.utf8Data);
            if(msg.Speed)
                _treadmill.controlpanel.speed(msg.Speed);
            else if(msg.Incline)
                _treadmill.controlpanel.incline(msg.Incline);
            else if(msg.Reset)
                _treadmill.controlpanel.reset();
            else if(msg.Autopace)
                _treadmill.autopace.action(msg.Autopace);
            else if(msg.User)
                _treadmill.setUser(msg.User, msg.Weight);
            else if(msg.Get) {
                try {
                    console.log("request for schema "+msg.Get);
                    var data;
                    if(msg.Get==='users')
                        data = _treadmill.users;
                    else if(msg.Get==='user')
                        data = (_treadmill.session!==null) ? _treadmill.session.user : null;
                    else if(msg.Get==='metrics')
                        data = _treadmill.metrics;

                    // send the reply
                    _treadmill.connection.sendUTF(JSON.stringify({ type:'response', schema:msg.Get, response: data }));
                } catch(ex) {
                    console.log("failed to send '"+msg.Get+"' : "+ex);
                }
            }
        }
    };

Treadmill.prototype.acceptConnection = function(request)
{
    // close any existing connection
    if(this.connection!==null) {
        let oc = this.connection;
        this.connection = null;
        oc.close();
    }

    // accept the new one
    this.connection = request.accept(null, request.origin);
    console.log("connection from host:"+request.host+"   origin:"+request.origin);

    // This is the most important callback for us, we'll handle
    // all messages from users here.
    this.connection.on('message', (message) => { this.parseMessage(message); });

    this.connection.on('close', function(connection) {
        // close user connection
        this.connection = null;
        this.controlpanel.speed("STOP");
        this.__updateInterval = null;
	    console.log("closed");
    }.bind(this));

    this.controlpanel.enable();
};

Treadmill.prototype.abortConnection = function()
{
    if(this.connection) {
        this.connection.close();
        this.connection = null;
    }
    this.controlpanel.speed("STOP");
    this.controlpanel.disable();
};



// enumerate drivers
drivers.enumerate();
drivers.probe({
    tree: drivers
});

// ensure we have all config
var treadmill = new Treadmill();


