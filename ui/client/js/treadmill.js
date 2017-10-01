const postal = require('postal');
const Q = require('q');

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

    // get hostname from query string if present
    this.host = getParameterByName("host")
        ? getParameterByName("host")
        : options.host;

    // get host from host line (meaning UI and Treadmill service on the same server)
    if(!this.host)
        this.host = window.location.hostname;

    // log what host we are going to try
    console.log("treadmill host: "+this.host);

    // set if you are debugging RPC communication to Treadmill service
	//this.rpc.debug = true;

    //this.forward("controlpanel", "state");
    //this.forward("controlpanel", "session.#");
    //this.forward("controlpanel", "event.#");

    /*** Remote Interfaces on Treadmill Service
     *
     */

    // Control Panel
    // This function object represents the remote interface on the ControlPanel
    // driver which mimics the interface of an old style Treadmill panel.
    this.controlpanel = {
        endpoint: "user/experience/controlpanel",
        speed: (value) => this.rpc(this.controlpanel.endpoint, "speed", value),
        increment: () => this.rpc(this.controlpanel.endpoint, "speed", '++'),
        decrement: () => this.rpc(this.controlpanel.endpoint, "speed", '--'),
        incline: (value) => this.rpc(this.controlpanel.endpoint, "incline", value),
        stop: () => this.rpc(this.controlpanel.endpoint, "stop"),
        fullstop: () => this.rpc(this.controlpanel.endpoint, "fullstop"),
        reset: () => this.rpc(this.controlpanel.endpoint, "reset")
    };

    // Data Model
    // This contains remote interfaces to manipulate data such as users
    // or recording run status.
    this.data = {
        // Users
        // Interface for querying system users and manipulating the current user.
        users: {
            endpoint: "data/users",
            all: (value) => this.rpc(this.data.users.endpoint, "users"),
            current: () => this.rpc(this.data.users.endpoint, "user"),
            select: (id) => this.rpc(this.data.users.endpoint, "setUser", id)
        }
    }
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
     this.connection = new WebSocket("ws://"+this.host+":27001/echo");
     this.connection.onopen = function()
     {
        // Web Socket is connected, send data using send()
		this.channel.connection.publish("connected", {
		    host: this.host,
            message: "connected",
		    connected: true
		});
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


/**
 * Configure postal.js channel/topic messages to be sent to remote clients.
 * @param {string} channel - The postal.js channel name
 * @param {string} topic... - The postal.js topic name to catch (accepts postal.js wildcards}
 * @returns {boolean} true if at least one remote subscription was forwarded
 */
Treadmill.prototype.remoteSubscribe = function()
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
                        this.connection.send(JSON.stringify(envelope));
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

Treadmill.prototype.rpc = function(driver, funcname)
{
    // ensure the response handler is setup
    if(this._rpc === undefined) {
        this._rpc = {
            pending: [],
            cookie: 1,
            defer: function () {
                let deferred = Q.defer();
                deferred.cookie = this.cookie;
                this.pending.push(deferred);
                //console.log("defer "+deferred.cookie+": ", deferred);
                return deferred;
            },
            promise: function(cookie) {
                for(let i=0,_i=this.pending.length; i<_i; i++)
                    if(this.pending[i] && this.pending[i].cookie === cookie ) {
                        let defer = this.pending[i];
                        this.pending[i] = null;
                        return defer;
                    }
                    return null;
            },
            response_handler: postal.subscribe({
                channel: "system",
                topic: "rpc.response",
                callback: function (data, envelope) {
                    //console.log("rpc-response: ", envelope);
                    let defer = this._rpc.promise(data.cookie);
                    if(defer!==null) {
                        defer.resolve(data.response);
                    }
                }.bind(this)
            })
        }
    };

    if(arguments.length <2)
        return false;
    let args = [];
    Array.prototype.push.apply(args, arguments);
    args.shift(); args.shift(); // remove the two known arguments

    let defer = this._rpc.defer();
    let envelope = {
        channel: "system",
        topic: "rpc.request",
        data: {
            driver: driver,
            func: funcname,
            arguments: args,
            cookie: defer.cookie
        }
    };
    try {
        if (this.connection!==undefined && this.connection!==null) {
            this.connection.send(JSON.stringify(envelope));
        }
        if(this.debug || this.rpc.debug)
            console.log(envelope);
    } catch (ex) {
        console.log("warning: rpc call failed, likely connection error, aborting connection.");
        console.log("rpc object was ", envelope);
    }
    return defer.promise;
};

Treadmill.prototype.remote = function(channel, topic, data)
{
    if(!channel || !subtopic)
        return false;
    let envelope = {
        channel: channel,
        topic: topic,
        data: data
    };
    try {
        if (this.connection!==undefined && this.connection!==null) {
            this.connection.send(JSON.stringify(envelope));
        }
        if(this.debug || this.rpc.debug)
            console.log(envelope);
    } catch (ex) {
        console.log("warning: rpc call failed, likely connection error, aborting connection.");
        console.log("rpc object was ", envelope);
        this.abortConnection();
    }
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


