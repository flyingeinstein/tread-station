
process.on('SIGINT', function() {
    console.trace("Caught interrupt signal");
    process.exit();
});

require('./math-util');
const postal = require('postal');
const http = require('http');
const WebSocketServer = require('websocket').server;
const DriverTree = require('./drivers/drivertree');
const DataModel = require("./datamodel");


class DisabledFeature
{
    constructor(name) {
        this.name = name;
    }

    action() {
        console.log("feature "+name+" not enabled");
    }
}

/**
 * The main Tread-Station class
 * @constructor
 */
function Treadmill()
{
    this.drivers = new DriverTree();
    this.datamodel = new DataModel(null);
    this.system = {
    };

    this.channels = {
        system: postal.channel("system")
    } ;

// enumerate drivers
    this.drivers.enumerate();
    this.drivers.probe(this.system);

    if(!this.drivers) { this.fatal("internal error: no driver tree"); }
    this.controlpanel = this.drivers.$("user/experience/controlpanel");
    if(!this.controlpanel) { this.fatal("internal error: no treadmill user control driver found"); }

    // for now, no autopace feature
    this.autopace = new DisabledFeature("autopace");

    this.active = false;

    // internals
    this.connection = null;
    this.__updateInterval = null;
    this.__updateInterval = null;

    //this.remoteSubscribe.debug = true;
    this.remoteSubscribe("controlpanel", "state");
    this.remoteSubscribe("controlpanel", "session.#");
    this.remoteSubscribe("controlpanel", "event.#");
    this.remoteSubscribe("users", "#");
    this.remoteSubscribe("user", "#");

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

    this.channels.system.subscribe("rpc.request", function(data, envelope) {
        if(data.driver && data.func) {
            let driver = this.drivers.$(data.driver);
            if (driver!==null) {
                let response = null;
                if (typeof driver[data.func] ==="function") {
                    console.log("rpc call: "+driver.devicePath+"."+data.func+"  ",data.arguments);
                    driver[data.func].apply(driver, data.arguments);
                } else if (typeof driver[data.func] ==="object") {
                    response = driver[data.func];
                }

                // send back the response
                if(response!==null) {
                    if (this.connection!==undefined && this.connection!==null)
                        this.connection.sendUTF(JSON.stringify({
                            channel: "system",
                            topic: "rpc.response",
                            data: {
                                driver: data.driver,
                                func: data.func,
                                cookie: (data.cookie !== undefined) ? data.cookie : null,
                                response: response
                            }
                        }));
                    else
                        console.log("rpc call: cannot send response");
                }
            }
        }
    }.bind(this));
}


Treadmill.prototype.fatal = function(error) {
    console.log(error);
    process.exit();
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

/* todo: re-enable weight management
(Treadmill.prototype.updateWeight = function(weight)
{
    if(this.datamodel && this.session && this.session.user)
        this.datamodel.updateWeight(this.session.user, weight);
};*/

Treadmill.prototype.parseMessage = function(msg) {
        var _treadmill = this;
        console.log("warning: old style messages ", msg);
        if(msg.User)
            _treadmill.setUser(msg.User, msg.Weight);
        //else if(msg.Autopace)
        //    _treadmill.autopace.action(msg.Autopace);
        else if(msg.Get) {
            try {
                console.log("request for schema "+msg.Get);
                var data;
                if(msg.Get==='users')
                    data = this.system.users;
                else if(msg.Get==='user')
                    data = (this.system.session!==null && this.system.session.user!==null) ? this.system.session.user : null;
                else if(msg.Get==='metrics')
                    data = _treadmill.metrics;

                // send the reply
                _treadmill.connection.sendUTF(JSON.stringify({ type:'response', schema:msg.Get, response: data }));
            } catch(ex) {
                console.log("failed to send '"+msg.Get+"' : "+ex);
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
    this.connection.on('message', (message) => {
        if (message.type === 'utf8') {
            var msg = JSON.parse(message.utf8Data);
            if (msg.channel !== undefined && msg.topic !== undefined && msg.channel !== null && msg.topic !== null)
                postal.publish(msg);
            else
                this.parseMessage(msg);
        }
    });

    this.connection.on('close', function(connection) {
        // close user connection
        this.connection = null;
        this.controlpanel.speed("STOP");
        this.__updateInterval = null;
	    console.log("closed");
    }.bind(this));

    this.controlpanel.enable();
    this.controlpanel.setUser(0);

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




// ensure we have all config
let treadmill = new Treadmill();


