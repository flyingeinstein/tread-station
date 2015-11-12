

app.service("treadmillService", ['$rootScope', function($rootScope) {

    // variables
    this.speed = -1;
    this.incline = -1;
    this.runningTime = { seconds:0, minutes:0, hours:0 };

    this.goaltime = 1.5 * 3600;

    // internals
    var _treadmill = this;
    this.eventHandlers = {};


    function ws_status(str) {
        $("#ConnectionStatus").text(str);
    }

    this.connect = function (url) {
        if ("WebSocket" in window) {
            var _treadmill = this;

            // Let us open a web socket
            ws_status("connecting...");
            this.connection = new WebSocket("ws://192.168.2.48:27001/echo");
            this.connection.onopen = function () {
                // Web Socket is connected, send data using send()
                ws_status("Connected.");
                //_treadmill.parseEvent("connected");
                notifyEvent("connected",null);

                // request some objects from the treadmill service
                _treadmill.request("users");
                _treadmill.request("user");
            };
            this.connection.onmessage = function (evt) {
                var received_msg = evt.data;
                var msg = JSON.parse(received_msg);
                if (msg != null)
                    _treadmill.parseMessage(msg);
            };
            this.connection.onclose = function () {
                // websocket is closed.
                ws_status("Connection closed.");
                this.connection = null;
                _treadmill.parseEvent("closed");
            };
            this.connection.onerror = function (evt) {
                ws_status("Connection error : " + evt.data);
                setTimeout(function () {
                    _treadmill.connect(url);
                }, 5000);
            }
        } else
            alert("web sockets not supported");
    };

    this.request = function (schema) {
        if (this.connection)
            this.connection.send(JSON.stringify({Get: schema}));
    };

    this.on = function (eventName, callback) {
        this.eventHandlers[eventName] = callback;
    };

    function notifyEvent(name, data)
    {
        $rootScope.$broadcast("treadmill.on."+name, data );
    }

    function updateRunningTime(millis) {
        var seconds, minutes, hours;
        seconds = Math.floor(millis / 1000);
        minutes = Math.floor((seconds / 60)) % 60;
        hours = Math.floor(seconds / 3600);
        seconds = seconds % 60;
        //this.onUpdateRunningTime(seconds, minutes, hours);
        var rt = {
            seconds: seconds,
            minutes: minutes,
            hours: hours
        };
        if(this.runningTime==null || rt.seconds!=this.runningTime.seconds || rt.minutes!=this.runningTime.minutes || rt.hours!=this.runningTime.hours) {
            $rootScope.$broadcast("treadmill.running-time", this.runningTime = rt);
        }
    };

    this.parseMessage = function (msg) {
        if (msg.type == "status") {
            if (msg.runningTime != null)
                updateRunningTime(msg.runningTime);

            if (this.speed != msg.currentSpeed) {
                this.speed = msg.currentSpeed;
                //if(this.onSpeedChanged)
                //    this.onSpeedChanged(msg.currentSpeed);
                $rootScope.$broadcast("treadmill.current-speed", msg.currentSpeed);
            }

            if (this.incline != msg.currentIncline) {
                this.incline = msg.currentIncline;
                //if(this.onInclineChanged)
                //    this.onInclineChanged(msg.currentIncline);
                $rootScope.$broadcast("treadmill.current-incline", msg.currentIncline);
            }
        } else if (msg.type == "event") {
            //this.parseEvent(msg.name, msg.data);
            notifyEvent(msg.name, msg.data);
        } else if (msg.type == "response") {
            //console.log(msg);
            if (msg.schema == "users")
                this.users = msg.response;
            else if (msg.schema == "user") {
                if (msg.response && msg.response.userid > 0) {
                    this.user = msg.response;
                    this.users[this.user.userid] = this.user;
                    this.goaltime = this.user.goaltime;
                    this.goaldistance = this.user.goaldistance;
                }
            }

            //if(this.eventHandlers && this.eventHandlers[msg.schema]!=null)
            //	this.eventHandlers[msg.schema](msg.response);
            if (msg.schema != null)
                $rootScope.$broadcast("treadmill." + msg.schema, msg.response);

        }
    };

    this.setUser = function (user, weightUpdate) {
        if (this.connection)
            this.connection.send(JSON.stringify({User: user, Weight: weightUpdate}));
    };

    this.parseEvent = function (name, data) {
    };

    this.setSpeed = function (value) {
        if (this.resetTimer != null)
            clearTimeout(this.resetTimer);

        if (this.connection)
            this.connection.send(JSON.stringify({Speed: value}));
    };

    this.setIncline = function (value) {
        if (this.connection)
            this.connection.send(JSON.stringify({Incline: value}));
    };

    this.increaseSpeed = function () {
        return this.setSpeed("++");
    };

    this.decreaseSpeed = function () {
        return this.setSpeed("--");
    };

    this.stop = function () {
        return this.setSpeed("STOP");
    };

    this.estop = function () {
        return this.setSpeed("ESTOP");
    };

    this.reset = function (value) {
        if (this.resetTimer != null)
            clearTimeout(this.resetTimer);
        if (this.connection)
            this.connection.send(JSON.stringify({Reset: true}));
    };

    this.inclineUp = function () {
        return this.setIncline("++");
    };

    this.inclineDown = function () {
        return this.setIncline("--");
    };

    this.floor = function () {
        return this.setIncline("FLOOR");
    };

}]);
