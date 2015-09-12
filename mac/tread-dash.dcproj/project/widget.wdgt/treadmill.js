
var treadmill;


function zeropad(number) {
    return (number<10) ? '0'+number : number;
}

function Treadmill()
{
    // variables
	this.speed = -1;
    this.incline = -1;
    
    // internals
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
     };
     this.connection.onerror = function(evt)
     {
        ws_status("Connection error : "+evt.data);      
     }
  } else
    alert("web sockets not supported");
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
    }
}

Treadmill.prototype.setSpeed = function(value) 
{
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