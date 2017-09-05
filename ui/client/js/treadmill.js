const postal = require('postal');

function zeropad(number) {
    return (number<10) ? '0'+number : number;
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export default function Treadmill(options)
{
    if(options===null) {
        options = {};
    }

    this.host = options.host
        ? options.host
        : getParameterByName("host");
    if(!this.host)
        this.host = window.location.hostname;
    console.log("treadmill host: "+this.host);

    // variables
	this.speed = -1;
    this.incline = -1;

    // Research suggests walking 5 miles a day is the magic number when it comes to health and fitness. For this reason
    // we choose a goal distance of 5 miles. Based on an average human walking speed of 3.1 miles/hour (wikipedia) this
    // translates to about 90 minutes of of walking. The user will choose a goal based on either time or distance but
    // either choice they will walk the magic number if they accept the defaults.
    // references:
    //     https://en.wikipedia.org/wiki/Preferred_walking_speed
    //     http://www.livescience.com/10406-fast-walk-predict-long-youll-live.html
	this.goal = {
        time: 1.5 * 3600,       // hour and a half
        distance: 5             // 5 miles
    };

    //this.forward("controlpanel", "state");
    //this.forward("controlpanel", "session.#");
    //this.forward("controlpanel", "event.#");

    // internals
	var _treadmill = this;
	this.eventHandlers = {
	};
	this.onConnectionStatus = function(connected, message) { console.log(message); };
}

/**
 * Configure postal.js channel/topic messages to be sent to remote clients.
 * @param {string} channel - The postal.js channel name
 * @param {string} topic... - The postal.js topic name to catch (accepts postal.js wildcards}
 * @returns {boolean} true if at least one remote subscription was forwarded
 */
Treadmill.prototype.forward = function()
{
    // todo: could this be added to postal.prototype instead?
    if(arguments.length <2)
        return false;
    let args = [];
    Array.prototype.push.apply(args, arguments);
    let channel = args.shift();
    while(args.length) {
        let topic = args.shift();
        postal.subscribe({
            channel: channel,
            topic: topic,
            callback: function (data, envelope) {
                try {
                    if (this.connection!==undefined && this.connection!==null) {
                        this.connection.sendUTF(JSON.stringify(envelope));
                    }
                    if(this.debug || this.remoteSubscribe.debug)
                        console.log(envelope);
                } catch (ex) {
                    console.log("warning: failed to transmit postal event, likely connection error, aborting connection.");
                    console.log("status object was ", envelope);
                    this.abortConnection();
                }
            }.bind(this)
        });
    }
    return true;
};

Treadmill.prototype.connect = function()
{
  if ("WebSocket" in window)
  {
     let _treadmill = this;
     this.channel = {
         connection: postal.channel("connection"),
         controlpanel: postal.channel("controlpanel")
     };


     // Let us open a web socket
     this.onConnectionStatus(false, "connecting to "+this.host+"...");
     this.connection = new WebSocket("ws://"+this.host+":27001/echo");
     this.connection.onopen = function()
     {
        // Web Socket is connected, send data using send()
		this.channel.connection.publish("connected", {
		    host: this.host,
            message: "connected",
		    connected: true
		});
		
		// request some objects from the treadmill service
		_treadmill.request("users");
		_treadmill.request("user");		
	}.bind(this);
     this.connection.onmessage = function (evt) 
     {
        let received_msg = evt.data;
        let msg = JSON.parse(received_msg);
        if(msg!==null) {
            // delgate to postal, some other module may be interested in it
            if(msg.channel!==undefined && msg.topic!==undefined && msg.channel!==null && msg.topic!==null)
                postal.publish(msg);
        }
     }.bind(this);

     this.connection.onclose = function()
     { 
         // Web Socket is closed
         this.channel.connection.publish("connected", {
             host: this.host,
             message: "disconnected",
             connected: false
         });

         //_treadmill.onConnectionStatus(false, "Connection closed.");
         _treadmill.connection = null;
		_treadmill.parseEvent("closed");
     }.bind(this);

     this.connection.onerror = function(evt)
     {
         this.channel.connection.publish("error", {
             host: this.host,
             message: evt.data
         });
	    setTimeout(function(){ _treadmill.connect(); }, 5000);
     }.bind(this);
  } else
    alert("web sockets not supported");
};

Treadmill.prototype.request = function(schema)
{
    if(this.connection)
		this.connection.send(JSON.stringify({ Get: schema }));
};

Treadmill.prototype.on = function(eventName, callback)
{
	this.eventHandlers[eventName] = callback;
};

Treadmill.prototype.parseMessage = function(msg)
{
    /*
    if (msg.channel==="controlpanel") {
        if(msg.topic==="state") {
            if(this.speed !== msg.currentSpeed)
            {
                this.speed = msg.currentSpeed;
                if(this.onSpeedChanged)
                    this.onSpeedChanged(msg.currentSpeed);
            }

            if(this.incline !== msg.currentIncline)
            {
                this.incline = msg.currentIncline;
                if(this.onInclineChanged)
                    this.onInclineChanged(msg.currentIncline);

            }
        } else {
            console.log("ControlPanel "+msg.topic+": ", msg.data);
        }
    } else if(msg.type==="event") {
		this.parseEvent(msg.name, msg.data);
    } else if(msg.type==="response") {
		//console.log(msg);
		if(msg.schema==="users")
			this.users = msg.response;
		else if(msg.schema==="user")
		{
			if(msg.response && msg.response.userid>0) {
				this.user = msg.response;
				this.users[this.user.userid] = this.user;
				this.goal.time = this.user.goaltime;
				this.goal.distance = this.user.goaldistance;
			}
		}
		
		if(this.eventHandlers && this.eventHandlers[msg.schema]!=null)
			this.eventHandlers[msg.schema](msg.response);
    }
    */
};

Treadmill.prototype.setUser = function(user, weightUpdate) 
{
    if(this.connection)
        this.connection.send(JSON.stringify({ User: user, Weight: weightUpdate }));
};
	
Treadmill.prototype.parseEvent = function(name, data)
{
    // this should not be edited, the main app will override this member
};

Treadmill.prototype.setSpeed = function(value) 
{
	if(this.resetTimer!==null)
		clearTimeout(this.resetTimer);
				
    if(this.connection)
        this.connection.send(JSON.stringify({ Speed: value }));
};

Treadmill.prototype.setIncline = function(value) 
{
    if(this.connection)
        this.connection.send(JSON.stringify({ Incline: value }));
};

Treadmill.prototype.increaseSpeed = function() 
{
    return this.setSpeed("++");
};

Treadmill.prototype.decreaseSpeed = function() 
{
    return this.setSpeed("--");
};

Treadmill.prototype.stop = function() 
{
    return this.setSpeed("STOP");
};

Treadmill.prototype.estop = function() 
{
    return this.setSpeed("ESTOP");
};

Treadmill.prototype.reset = function(value) 
{
	if(this.resetTimer!==null)
		clearTimeout(this.resetTimer);
	if(this.connection)
        this.connection.send(JSON.stringify({ Reset: true }));
};
	
Treadmill.prototype.inclineUp = function() 
{
    return this.setIncline("++");
};

Treadmill.prototype.inclineDown = function() 
{
    return this.setIncline("--");
};

Treadmill.prototype.floor = function() 
{
    return this.setIncline("FLOOR");
};

Treadmill.prototype.autopace = function(value)
{
    if(this.connection && value)
        this.connection.send(JSON.stringify({ Autopace: value }));
};

Treadmill.prototype.formatTime = function(millis)
{
    let seconds, minutes, hours;
    seconds = Math.floor(millis / 1000);
    minutes = Math.floor((seconds / 60)) % 60;
    hours = Math.floor(seconds / 3600);
    seconds = seconds % 60;
    return hours+":"+zeropad(minutes)+":"+zeropad(seconds);
};


