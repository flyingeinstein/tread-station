/* 
 This file was generated by Dashcode.  
 You may edit this file to customize your widget or web page 
 according to the license.txt file included in the project.
 */

 var treadmill = null;

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
$(function() {
    treadmill = new Treadmill();
	
	$("#speed-dial").dial();
		
	/*$('#speed-startstop').click(function(e) {
		console.log($(this).text());
		if($(this).text() == "RUN")		
			treadmill.setSpeed("2.2");
		else
			treadmill.setSpeed("STOP");
		});*/
			
	$('.speed-decrease').on('click', function() { treadmill.decreaseSpeed(); });
	$('.speed-increase').on('click', function() { treadmill.increaseSpeed(); });
	$('.stop').on('click', function() { treadmill.stop(); });
	$('.reset').on('click', function() { treadmill.reset(); });
	
	$('.quick-dial li').on('click', function() { treadmill.setSpeed(Number($(this).text())); });
	
	Treadmill.prototype.parseEvent = function(name, data)
	{
		if(name=="connected") {
			$("body").addClass("connected");	
			$("body").removeClass("disconnected");	
			$(".status-indicator").text("LET'S GO!");
		} else if(name=="closed") {
			$("body").addClass("disconnected");	
			$("body").removeClass("connected");
			$("body").removeClass("running");
			$("body").removeClass("stopped");
			$(".status-indicator").text("DISCONNECTED");    
		} else if(name=="running") {
			$("body").removeClass("stopped");
			$("body").addClass("running");
			$(".status-indicator").text("RUNNING");
		} else if(name=="stopping") {
			$("body").removeClass("running");
			$("body").addClass("stopped");
			$(".status-indicator").text("STOPPING");
		} else if(name=="stopped") {
			$("body").removeClass("running");
			$("body").addClass("stopped");
			$(".status-indicator").text("");
		}
	}
	
	// show some debug info
	var s = "<hr/>width:"+window.innerWidth+"  height:"+window.innerHeight;
	$("div#debug").html(s);
		
    treadmill.connect("treadmill");
});


Treadmill.prototype.onSpeedChanged = function(value) 
{
	console.log(value);
	if(value==0.0)
		$(".speed-indicator").text("0");
    else
    	$(".speed-indicator").text(value.toFixed(1));    
}

Treadmill.prototype.onInclineChanged = function(value)
{
    //$("#InclineIndicator").text(Math.round(value));
}

Treadmill.prototype.onUpdateRunningTime = function(seconds, minutes, hours)
{
    var rt = zeropad(minutes)+":"+zeropad(seconds);
    if(hours>0)	// more than an hour
		rt = hours+":"+rt;
	$(".running-time").text(rt);
}

function SetFavSpeed(event)
{
    treadmill.setSpeed($(event.target).text());
}



function decline(event)
{
    treadmill.inclineDown();
}


function incline(event)
{
    treadmill.inclineUp();
}


function inclineFloor(event)
{
    treadmill.floor();
}

