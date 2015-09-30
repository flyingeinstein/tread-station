
var treadmill;


function zeropad(number) {
    return (number<10) ? '0'+number : number;
}

function Treadmill()
{
    // variables
	this.speed = -1;
    this.incline = -1;
	
	this.goaltime = 1.5*3600;
    
    // internals
	var _treadmill = this;
	this.eventHandlers = {
	};
}

function ws_status(str)
{
    $("#ConnectionStatus").text(str);
}

Treadmill.prototype.connect = function(url)
{
  if ("WebSocket" in window)
  {
     var _treadmill = this;
     
     // Let us open a web socket
     ws_status("connecting...");
     this.connection = new WebSocket("ws://192.168.2.48:27001/echo");
     this.connection.onopen = function()
     {
        // Web Socket is connected, send data using send()
        ws_status("Connected.");
		_treadmill.parseEvent("connected");
		
		// request some objects from the treadmill service
		_treadmill.request("users");
		_treadmill.request("user");		
	};
     this.connection.onmessage = function (evt) 
     {
        var received_msg = evt.data;
        var msg = JSON.parse(received_msg);
        if(msg!=null)
            _treadmill.parseMessage(msg);        
     };
     this.connection.onclose = function()
     { 
        // websocket is closed.
        ws_status("Connection closed."); 
        this.connection = null;
		_treadmill.parseEvent("closed");
     };
     this.connection.onerror = function(evt)
     {
        ws_status("Connection error : "+evt.data);
	setTimeout(function(){ _treadmill.connect(url); }, 5000);
     }
  } else
    alert("web sockets not supported");
}

Treadmill.prototype.request = function(schema)
{
    if(this.connection)
		this.connection.send(JSON.stringify({ Get: schema }));
}

Treadmill.prototype.on = function(eventName, callback)
{
	this.eventHandlers[eventName] = callback;
}

Treadmill.prototype.parseMessage = function(msg)
{
    if(msg.type=="status") {
        this.updateRunningTime(msg.runningTime);
        
        if(this.speed != msg.currentSpeed)
        {
            this.speed = msg.currentSpeed;
            if(this.onSpeedChanged)
                this.onSpeedChanged(msg.currentSpeed);
        }
        
        if(this.incline != msg.currentIncline)
        {
            this.incline = msg.currentIncline;
            if(this.onInclineChanged)
                this.onInclineChanged(msg.currentIncline);
                
        }
    } else if(msg.type=="event") {
		this.parseEvent(msg.name, msg.data);
    } else if(msg.type=="response") {
		console.log(msg);
		if(msg.schema=="users")
			this.users = msg.response;
		else if(msg.schema=="user")
		{
			if(msg.response.userid>0) {
				this.user = msg.response;
				this.users[this.user.userid] = this.user;
				this.goaltime = this.user.goaltime;
				this.goaldistance = this.user.goaldistance;
			}
		}
		
		if(this.eventHandlers && this.eventHandlers[msg.schema]!=null)
			this.eventHandlers[msg.schema](msg.response);
    }
}

Treadmill.prototype.setUser = function(user, weightUpdate) 
{
    if(this.connection)
        this.connection.send(JSON.stringify({ User: user, Weight: weightUpdate }));
}
	
Treadmill.prototype.parseEvent = function(name, data)
{
}

Treadmill.prototype.setSpeed = function(value) 
{
	if(this.resetTimer!=null)
		clearTimeout(this.resetTimer);
				
    if(this.connection)
        this.connection.send(JSON.stringify({ Speed: value }));
}

Treadmill.prototype.setIncline = function(value) 
{
    if(this.connection)
        this.connection.send(JSON.stringify({ Incline: value }));
}

Treadmill.prototype.increaseSpeed = function() 
{
    return this.setSpeed("++");
}

Treadmill.prototype.decreaseSpeed = function() 
{
    return this.setSpeed("--");
}

Treadmill.prototype.stop = function() 
{
    return this.setSpeed("STOP");
}

Treadmill.prototype.estop = function() 
{
    return this.setSpeed("ESTOP");
}

Treadmill.prototype.reset = function(value) 
{
	if(this.resetTimer!=null)
		clearTimeout(this.resetTimer);
	if(this.connection)
        this.connection.send(JSON.stringify({ Reset: true }));
}
	
Treadmill.prototype.inclineUp = function() 
{
    return this.setIncline("++");
}

Treadmill.prototype.inclineDown = function() 
{
    return this.setIncline("--");
}

Treadmill.prototype.floor = function() 
{
    return this.setIncline("FLOOR");
}

Treadmill.prototype.updateRunningTime = function(millis)
{
	var seconds, minutes, hours;
	if(this.onUpdateRunningTime) {
        seconds = Math.floor(millis / 1000);
        minutes = Math.floor((seconds / 60)) % 60;
        hours = Math.floor(seconds / 3600);
        seconds = seconds % 60;
        this.onUpdateRunningTime(seconds, minutes, hours);
    }
}

$(function() 
{
	treadmill = new Treadmill();
});
