/* 
 This file was generated by Dashcode.  
 You may edit this file to customize your widget or web page 
 according to the license.txt file included in the project.
 */

var prefKey = "treadstation-ip";
var treadmill = null;

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
$(function() {
    treadmill = new Treadmill();
	
	$('#startstop').click(function(e) {
		console.log($(this).text());
		if($(this).text() == "RUN")		
			treadmill.setSpeed("2.2");
		else
			treadmill.setSpeed("STOP");
		});
	
	$('#slower').on('click', function() {
		treadmill.decreaseSpeed();
	});

	$('#faster').on('click', function() {
		treadmill.increaseSpeed();
	});
	
	Treadmill.prototype.parseEvent = function(name, data)
	{
		if(name=="connected") {
			$("body").addClass("connected");	
		} else if(name=="closed") {
			$("#SpeedIndicator").text("NO CONNECTION!");    
			$("body").removeClass("connected");			
		} else if(name=="running") {
			$("body").addClass("running");
			$("#startstop").text("STOP");
		} else if(name=="stopped") {
			$("body").removeClass("running");
			$("#startstop").text("RUN");
		}
	}
	
	// show some debug info
	var s = "<hr/>width:"+window.innerWidth+"  height:"+window.innerHeight;
	$("div#debug").html(s);
		
    treadmill.connect("192.168.2.48");
});


Treadmill.prototype.onSpeedChanged = function(value) 
{
	if(value==0.0)
		$("#SpeedIndicator").text("-.-");
    else
    	$("#SpeedIndicator").text(value.toFixed(1));    
}

Treadmill.prototype.onInclineChanged = function(value)
{
    $("#InclineIndicator").text(Math.round(value));
}

Treadmill.prototype.onUpdateRunningTime = function(seconds, minutes, hours)
{
	return false;
    $("#RunningSeconds").text( zeropad(seconds) );
    $("#RunningMinutes").text( zeropad(minutes) );
    if(hours>0)	// more than an hour
    {
        $("#RunningHours").text( hours );
    } else {
        $("#RunningHours").text( "" );
    }
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

