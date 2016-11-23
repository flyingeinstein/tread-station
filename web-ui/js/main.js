
 var treadmill = null;

 var sayings = [
 	"Get ready to rumble!",
	"Welcome to Club Med",
	"Beach Body in Progress",
	"Work those abs",
	"I'm sexy and I know it!"
 ];

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
$(function() {
    treadmill = new Treadmill();

	var dial = treadmill.dial = $("#speed-dial").dial();
	dial.treadmill = treadmill;
    dial.speed.options.transition = false;


	// speed increment/decrement buttons
	dial.plugin("increment",  new ButtonGroupIndicator({
		lane: {
			ordinal: 0,
			//offset: dial.getLane(-1).offset,     // make this lane start at the same offset as lane 1
			alignment: 'bottom'
		},
		arcrange: [ 0.83*Math.PI, 1.17*Math.PI ],
		button_options: {
			background: {
				fill: '#222',
				margin: { inner: dial.progress.lane.offset - dial.speed.lane.offset }
			},
			text: {
				color: '#aaa',
				size: '90px'
			},
            click: function(b) { if(b.name=="speed-increase") treadmill.increaseSpeed(); else treadmill.decreaseSpeed(); }
        },
		buttons: [
			{
				id: "speed-increase",
				caption: "$up"
			},
			{
				id: "speed-decrease",
				caption: "$down"
            }
		]
	}));

	dial.plugin("autopace",  new AutoPaceIndicator({
		lane: {
			ordinal: 1,
			alignment: 'left'
		},
		arcrange: 0.6*Math.PI
	}));
    dial.plugin("incline",  new InclineIndicator({
        lane: {
            ordinal: 2,
            alignment: 'left'
        },
        arcrange: 0.6*Math.PI
    }));

	// speed macro buttons
	dial.plugin("quickdial",  new ButtonGroupIndicator({
		lane: {
			ordinal: 3,
			offset: dial.getLane(1).offset,     // make this lane start at the same offset as lane 1
			width: 400,                         // set as a large width for our buttons
			alignment: 'right'
		},
		arcrange: [ 0.75*Math.PI, 0.15*Math.PI ],
		button_options: {
			background: {
				fill: '#222'
			},
			text: {
				color: '#aaa',
				size: '90px'
			},
            //click: function(b) { dial.speed.set(Number(b.caption)); }
            click: function(b) { treadmill.setSpeed(Number(b.caption)); }
		},
		buttons: [
			"3.2","3.6","4.2","4.8","5.5"
		]
	}));


	dial.progress.options.valueFunction = function(secs, mins, hours) {
		return (secs + mins*60 + hours*3600) / dial.treadmill.goal.time;
	};

	$('.stop').on('click', function() { treadmill.stop(); });
	$('.reset').on('click', function() { treadmill.reset(); });

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
			console.log("wait for it");
			treadmill.resetTimer = setTimeout(function() { treadmill.reset(); $("#user-select").modal(); }, 10000);
		} else if(name=="sonar.value") {
			if(treadmill.sonarSlider) {
				treadmill.sonarSlider.setCurrent(data);
			}
		} else if(name=="sonar.error") {
			if(treadmill.sonarSlider) {
				//console.log("sonar error: "+data);
				treadmill.sonarSlider.error(data);
			}
		}
	}

	treadmill.on("user", function(user) { if(user!=null) $("#view-current-user").text(user.name); });
	treadmill.on("users", function(users) {
		var usergroup = $("#user-select .users");
		usergroup.html("");
		for(var u in users)
		{
			var user = users[u];
			if(u<=0) continue;
			var radio = d3.select(usergroup[0]).append("label")
				.attr("class","btn btn-default")
				.text(user.name)
				.on('click', function() {
					//console.log("yes "+this.val());
					//$("#enter-weight").attr("disabled","false");
					var weight = $("#enter-weight");
					var user = $(this).find("input").val();
					if(user>0) {
						weight.removeClass("disabled");
						weight.val( KgToLbs(treadmill.users[user].weight) );
					}
				})
				.append("input")
					.attr("type","radio")
					.attr("id","user"+user.userid)
					.attr("name","user")
					.attr("value",user.userid);
			}
	});

	var form = $("#user-select-form");
	$("#user-select").on("show.bs.modal", function() {
		//$("#user-select.modal .modal-title").text(sayings[Math.floor(Math.random()*sayings.length)]);
		$("#user-select.modal .modal-footer .qotd").html(qotd_rich());
	});

    $("#enter-weight").TouchSpin({
        width: '150px',
        min: 50, // Minimum value.
        max: 600, // Maximum value.
        boostat: 5, // Boost at every nth step.
        maxboostedstep: 10, // Maximum step when boosted.
        postfix: 'lbs', // Text after the input.
        step: 1, // Incremental/decremental step on up/down change.
        stepinterval: 100, // Refresh rate of the spinner in milliseconds.
        stepintervaldelay: 500 // Time in milliseconds before the spinner starts to spin.
    });

    $("#session-start").on("click", function() {
		var user = form.find("input:radio[name=user]:checked").val();
		var weight = form.find("input[name=weight]").val();
		console.log("session[user:"+user+", weight:"+weight+"]");
		treadmill.setUser(user, LbsToKg(weight));
	});

	// show some debug info
	var s = "<hr/>width:"+window.innerWidth+"  height:"+window.innerHeight;
	$("div#debug").html(s);

    dial.zoom(1.4, 1000);

    treadmill.connect("treadmill");

	// show the user selector screen (unless it is supplied on the query line)
	var _user = getParameterByName("user");
	if(_user) {
		// this is just meant for bypassing the screen during development,
		// so dont log a weight.
		/* WAS GOING TO compare to user collection to convert the username to userid, but
		   it seems I only have a simple UserID for each user anyway...so we can just pass
		   the name through.
		for(var u in treadmill.users) {
			var user = users[u];
			if(u.name ==_user)
			treadmill.setUser(u.userid, null);
		}*/

		setTimeout(function() { treadmill.setUser(_user, null); }, 1000);
	} else
		$("#user-select").modal();
});


Treadmill.prototype.onSpeedChanged = function(value)
{
	if(value==0.0)
		$(".speed-indicator").text("0");
    else
    	$(".speed-indicator").text(value.toFixed(1));
	if(this.dial)
	{
		this.dial.speed.set(value, true);
	}
};

Treadmill.prototype.onInclineChanged = function(value)
{
    //$("#InclineIndicator").text(Math.round(value));
};

Treadmill.prototype.onUpdateRunningTime = function(seconds, minutes, hours)
{
    var rt = zeropad(minutes)+":"+zeropad(seconds);
    if(hours>0)	// more than an hour
		rt = hours+":"+rt;
	$(".running-time").text(rt);
	//if(this.dial) this.dial.setRunningTime(seconds,minutes,hours);
	//this.dial.progress.set(seconds, minutes, hours);
};


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

function KgToLbs(kg)
{
	return Math.round(kg*2.2);
}


function LbsToKg(lbs)
{
	return lbs/2.2;
}
