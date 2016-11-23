

$(function() {
	var dialDefaults = {
		// none so far

	};
});

function polar2rect(radius, angle, offset)
{
	if(offset==null) offset={x:0, y:0};
	angle += -Math.PI/2;
	return {
		x: offset.x + radius*Math.cos(angle),
		y: offset.y + radius*Math.sin(angle)
	};
}


function Dial(_container, options) {

	this.options = {
		text: {
			style: "font-size: 200px"
		},
		zoom: 1.0
	};
	if(options)
		this.options = $.extend(true, this.options, options);

	this.container = $(_container);
	var _this = this;

	var width = this.width = 550;
	var height = this.height = 450;

	//var extents = this.extents = {width: 640, height: 640};
	//var radius = this.radius = extents.height / 2;
	//var center = this.center = {x: extents.width - radius, y: extents.height / 2};

	// viewbox starts at 1000pixel radius to encompass the root lane
	// if we add outer lanes then we will adjust the viewbox larger but keep the lane0 dial in the 1000,1000 extents
	var radius = this.radius = 1000;
	var extents = this.extents = {width: 1000, height: 1000};
	var center = this.center = {x: 0, y: 0};

	var dial_button_space = 0.18 * Math.PI;
	var dial_begin = -Math.PI + dial_button_space;
	var dial_end = -dial_begin;// + 0.1*Math.PI;

	this.scales = {};

	this.controls = {
		speed: {},
		incline: {},
		goal: {},
		groups: {},
		plugins: {}
	};

	// plugins API to dynamically add controls to the dial
	this.plugins = {};

	// lanes are concentric circles around the dial for controls. They can be inside the dial, such as the
	// goal progress indicator, or they can be outer lanes such as incline, autopace, etc.
	this.lanes = {
		inner: [],
		outer: []
	};

	// add some properties to each lanes collection
	this.lanes.outer.margin = 25;
	this.lanes.outer.width = 115;
	this.lanes.inner.margin = 15;
	this.lanes.inner.width = 20;

	this.container.html("");
	var svg = this.svg = d3.select(this.container[0]).append("svg")
		.attr("id", this.options.id)
		.attr("class","dial"
			+(this.options.class ? " "+this.options.class : ""))
		//.attr("width", this.width)
		//.attr("height", this.height)
		.attr("viewBox", "-1000 -1000 2000 2000");

	// add a border
	radius -= 32;

	var defs = svg.append("defs");
	var filter = defs.append("filter")
		.attr("id", "fe3")
		.attr("x", "0")
		.attr("y", "0")
		.attr("width", "200%")
		.attr("height", "200%");
	filter.append("feOffset")
		.attr("result", "offOut")
		.attr("in", "SourceAlpha")
		.attr("dx", "2")
		.attr("dy", "2");
	filter.append("feGaussianBlur")
		.attr("result", "blurOut")
		.attr("in", "offOut")
		.attr("stdDeviation", "10");
	filter.append("feBlend")
		.attr("in", "SourceGraphic")
		.attr("in2", "blurOut")
		.attr("mode", "normal");
	filter.append("feComponentTransfer")
		.append("feFuncA")
		.attr("type", "linear")
		.attr("slope", "0.4");


	var bg = svg.append("g")
		.attr("class", "background");
	bg.append("circle")
		.attr("class", "background-circle")
		.attr("cx", center.x)
		.attr("cy", center.y)
		.attr("r", radius)
		.attr("filter", "url(#fe3)")
	;

	var ticks = this.controls.groups.ticks = svg.append("g")
		.attr("class", "ticks");
	var bgticks = this.controls.groups.bgticks = ticks.append("g")
		.attr("class", "background-ticks");

	// lane control groups
	this.controls.lanes = svg.append("g")
		.attr("class", "lanes");
	this.lanes.inner.container = this.controls.lanes.inner = this.controls.lanes.append("g")
		.attr("class", "inner-lanes");
	this.lanes.outer.container = this.controls.lanes.outer = this.controls.lanes.append("g")
		.attr("class", "outer-lanes");

	// TODO: remove when goal is in it's own lane
	this.arcs = {};

	this.scales.speed = d3.scaleLinear()
		.domain([1, 9])
		.range([dial_begin, dial_end]
		);
	this.scales.progress = d3.scaleLinear()
		.domain([0, 1])
		.range(this.scales.speed.range());

	// create the speed lane (lane 0)
	var speedLane = this.lane0 = this.createLane(0, {
		offset: radius - radius * 0.26,
		width: radius*0.26
	});

	if(typeof GraduatedIndicator !=='undefined') {
		this.plugin("speed", new GraduatedIndicator({
				scale: this.scales.speed,
				lane: {
					ordinal: 0
				}
			})
		);
	}

	if(typeof DialIndicator !=='undefined') {
		this.plugin("progress", new DialIndicator({
				scale: this.scales.progress,
				type: 'progress',
				background: 'none',
				lane: {
					ordinal: -1,
					alignment: 'none'
				}
			})
		);
	}

	// center text indicators
	var status = svg.append("g")
		.attr("class","status");
	this.controls.status = status.append("text")
		.attr("class","status-indicator")
		.attr("text-anchor","middle")
		.attr("style", "font-size: 100px")
		.attr("x",center.x)
		.attr("y",center.y-radius*0.34)
		.text("...");
	this.controls.runningTime = status.append("text")
		.attr("class","running-time")
		.attr("text-anchor","middle")
		.attr("style",  "font-size: 120px")
		.attr("x",center.x)
		.attr("y",center.y-radius*0.20)
		.text("0:00");
	this.controls.speed.display = status.append("text")
		.attr("class","speed-indicator")
		.attr("text-anchor","middle")
		.attr("style", "font-size: 240px")
		.attr("x",center.x)
		.attr("y",center.y+radius*0.10)
		.text("");

	// resolve clicks to one of the lanes by comparing radius,
	// then to one of the controls by comparing the plugin/control scale ranges
	/*this.svg.on("click",function(){
		var lane, control;
		var m = _this.mouse();	// returns mouse coords as x,y and polar
		//console.log(m);
		for(var l in _this.lanes.outer) {
			lane = _this.lanes.outer[l];
			// find what lane the mouse falls in
			if(m.length > lane.offset && m.length < lane.offset + lane.width) {
				if(lane.controls) {
					for (var c in lane.controls) {
						var ctrl = lane.controls[c];
						if (ctrl.options.clickable!=false && ctrl.scale) {
							var _range = ctrl.scale.range();
							if (_range[1] < _range[0])
								_range = _range.reverse();
							if (_range && m.radius > _range[0] && m.radius < _range[1]) {
								control = ctrl;
								break;
							}
						}
					}
				}
				break;	// exit loop if we found a control
			} else lane = null;
		}
		if(lane && control && control.scale)
			console.log("click: control "+control.name+"   domain:"+m.domain(control.scale), control);
		else if(lane && control)
			console.log("click: control "+control.name+"   mouse:"+m, control);
		else if(lane!=null)
			console.log("click: lane ",lane)
	});
	*/
}

Dial.prototype.glyphs = {
	up: "M -20 10 L 0 -10 L 20 10",
	down: "M -20 -10 L 0 10 L 20 -10"
};

/*Dial.prototype.setRunningTime = function(seconds,minutes,hours)
{
	var percent = Math.min(1.0, (seconds+minutes*60+hours*3600) / this.treadmill.goal.time);
	console.log("goal "+(seconds+minutes*60+hours*3600)+" of "+this.treadmill.goal.time+"  ("+(percent*100).toFixed(1)+"%)");
	this.controls.goal.indicator
		.attr("d", this.arcs.goal(0, percent));
};*/

Dial.prototype.mouse = function()
{
	var _this = this;
	var m = d3.mouse(this.svg.node());
	var c = {
		x: m[0] - this.center.x,
		y: m[1] - this.center.y
	};
	c.radius = Math.atan2(c.x, -c.y);
	c.length = Math.sqrt(c.x*c.x + c.y*c.y);
	c.degrees = function() { return c.radius * 180/Math.PI; };
	c.domain = function(scale) { return scale ? scale.invert(c.radius) : _this.scales.speed.invert(c.radius); };
	return c;
};

Dial.prototype.zoom = function(value, transitionTimeMs)
{
	var _this = this;
	 var zoomFormat = function (v) {
		var z = 1000 * v;
		var nz = -z;
		return nz + " " + nz + " " + (z * 2) + " " + (z * 2);
	};

	if(transitionTimeMs) {
		// our local tween function
		var interpolator = d3.interpolate(this.options.zoom, value);

		function zoomTween() {
			return function(t) {
				return _this.options.zoom = zoomFormat(interpolator(t));
			}
		}

		this.svg.transition().duration(transitionTimeMs)
			.attrTween("viewBox", zoomTween);
	} else
		this.svg.attr("viewBox", zoomFormat(this.options.zoom = value));

}

/****** Dial Plugin API ******/

Dial.prototype.createLane = function(ordinal, options)
{
	// create lane is identical to getLane() unless
	if(isNaN(ordinal)) {
		console.log("dial.createLane: required ordinal parameter is not a number");
		return null;
	}

	var n = ordinal = Number(ordinal);
	var offset = 0;

	// figure out what collection of lanes we need to check
	var lanes;
	if(n<0) {
		// inner lane
		n = Math.abs(n)-1;
		lanes = this.lanes.inner;
	} else {
		// outer lane (including lane0)
		lanes = this.lanes.outer;
	}

	// see if the lane exists
	if(n < lanes.length)
		return lanes[n];	// existing lane

	// default lane options
	options = $.extend( {
			margin: lanes.margin,
			width: lanes.width
		}, options);

	var last_lane = (lanes.length>0) ? lanes[lanes.length-1] : {
		offset: this.lane0 ? this.lane0.offset : 0,
		margin: 0
	};

	// figure out the offset
	if(options.offset)
		offset = options.offset;
	else if (ordinal < 0) {
		// inner lane
		offset = last_lane.offset - options.margin - options.width;
	} else {
		// outer lane, including lane0
		offset = last_lane.offset + last_lane.width + options.margin;
	}
	//console.log("create lane "+ordinal+" offset "+offset);

	// return existing lane if it exists
	if (n < lanes.length)
		return lanes[n];

	// create a new lane
	var lane = {
		ordinal: ordinal,
		dial: this,
		container: lanes.container.append("g")
			.attr("class", "lane"+ordinal),

		controls: [],

		offset: offset,
		width: options.width,
		margin: options.margin,

		// draws an arc
		// arguments:
		//		angleStart - the angle around the lane of which the center of the tick mark will be drawn (North is zero radians)
		//		angleEnd - the thickness of the tick mark in radians
		//		margin - (optional) adjust the width of the tick { inner: , outer:  }
		arc: d3.arc()
			.startAngle(function (angleStart, angleEnd) { return angleStart; })
			.endAngle(function (angleStart, angleEnd) { return angleEnd; })
			.innerRadius(function(angleStart, angleEnd, margin) { return this.offset + ((margin!=null && margin.inner!=null) ? margin.inner : 0); })
			.outerRadius(function(angleStart, angleEnd, margin) { return this.offset + ((margin && margin.width) ? margin.width : this.width) + ((margin && margin.outer) ? margin.outer : 0); }),

		// draws a tick mark in the lane
		// arguments:
		//		angle - the angle around the lane of which the center of the tick mark will be drawn (North is zero radians)
		//		width - the thickness of the tick mark in radians
		//		margin - (optional) adjust the width of the tick { inner: , outer:  }
		tick: d3.arc()
			.startAngle(function (angle, width) { return angle-width; })
			.endAngle(function (angle, width) { return angle+width; })
			.innerRadius(function(angle, width, margin) { return this.offset + ((margin && margin.inner) ? margin.inner : 0); })
			.outerRadius(function(angle, width, margin) { return this.offset + this.width + ((margin && margin.outer) ? margin.outer : 0); })
	};

	// add an alternate width arc function in cases where the plugin may
	// want to be larger than the lane default
	// WARNING  This arc function copy doesnt work because of the 'this' references in the functions which need to resolve to the above
	//          lane object. For this to work, those this references would need to be converted into references on lane.
	/*lane.arc.width = function(width) {
		console.log("creating alternative arc for lane "+ordinal+" of width "+width);
		return lane.arc
			//.startAngle(function (angleStart, angleEnd) { return angleStart; })
			//.endAngle(function (angleStart, angleEnd) { return angleEnd; })
			//.innerRadius(function(angleStart, angleEnd, margin) { return this.offset + ((margin!=null && margin.inner!=null) ? margin.inner : 0); })
			.outerRadius(function(angleStart, angleEnd, margin) { return this.offset + width  + ((margin && margin.outer) ? margin.outer : 0); });
	};*/

	if(lane==null) {
		console.log("dial.createLane: lane creation error");
		return null;
	}

	// have the lane fade-in
	lane.container
		.attr("opacity", 0.0)
		.transition()
		.duration(1500)
		.attr("opacity", 1.0);

	lanes.push( lane );
	return lane;
};

Dial.prototype.getLane = function(laneNameOrOrdinal)
{
	if(!isNaN(laneNameOrOrdinal)) {
		// search by number
		var n = Number(laneNameOrOrdinal);
		if(n<0) {
			// inner lane
			n = Math.abs(n)-1;
			return (n < this.lanes.inner.length) ? this.lanes.inner[n] : null;
		} else
			// outer lane (including lane0)
			return (n < this.lanes.outer.length) ? this.lanes.outer[n] : null;
	}

	// search by name
	for(i=0; i<this.lanes.outer.length; i++)
		if(this.lanes.outer[i].name == laneNameOrOrdinal)
			return this.lanes.outer[i];
	for(i=0; i<this.lanes.inner.length; i++)
		if(this.lanes.inner[i].name == laneNameOrOrdinal)
			return this.lanes.inner[i];
	return null;
};

Dial.prototype.attachToLane = function(plugin, lane_request)
{
	var _this = this;

	// find the right lane or create one
	if(lane_request==null)
		return false;

	// the radial length of the control in the lane
	if(plugin.arcrange==null) {
		if(lane_request.arcrange)
			plugin.arcrange = lane_request.arc;
		else
			plugin.arcrange = [ 0.8*Math.PI, 0.35*Math.PI ];
	}

	var lane;
	if(lane_request.ordinal!=null)
		lane = this.createLane(lane_request.ordinal, lane_request);
	if(lane==null) {
		console.log("attachToLane: failed to create lane", lane_request);
		return false;
	}

	// get the lane0 root dial
	var dial = this.speed;

	// set the scale
	if (plugin.scale == null) {
		if (plugin.options.scale)
			plugin.scale = plugin.options.scale;
		else
		// default 0 => 1 domain
			plugin.scale = d3.scaleLinear()
				.domain([0, 1.0]);
	}

	var dial_range2, align2;
	plugin.computeRange = function() {
		var dial_range = (dial && dial.scale) ? dial.scale.range() : null;
		var arcrange = isNaN(plugin.options.arcrange) ? null :  plugin.options.arcrange;
		dial_range2 = dial_range;
		align2 = lane_request.alignment;
		var out=null;

		// set the arc range for this control within the lane
		if (typeof plugin.options.arcrange ==="object" && plugin.options.arcrange.constructor==Array)
			out= plugin.options.arcrange;
		else if (dial_range) {
			if (lane_request.alignment == null)
				out= dial_range;	// default to the same range as the main dial
			else if (lane_request.alignment == 'left') {
				out= [dial_range[0], arcrange ? dial_range[0] + arcrange : 0];
			} else if (lane_request.alignment == 'right') {
				out= [dial_range[1], arcrange ? dial_range[1] - arcrange : 0];
			} else if (lane_request.alignment == 'bottom') {
				if(!arcrange) arcrange = Math.PI/2;
				out= [Math.PI - arcrange / 2, Math.PI + arcrange / 2];
			} else if (lane_request.alignment == 'top') {
				if(!arcrange) arcrange = Math.PI/2;
				out= [-arcrange / 2, +arcrange / 2];
			} else {
				out= dial_range;	// default to the same range as the main dial
			}
		} else {
			// no dial range available, fill any leftover space
			//var controls =
			out= [-Math.PI, Math.PI];
		}
		if(out) {
			out.alignment = lane_request.alignment;
			out.arcrange = arcrange;
			out.dialrange = dial_range;
		}
		return out;
	};

	var r;
	plugin.scale.range( r = plugin.computeRange() );
	//console.log("range: ", r, "    dial: ",dial_range2, "    align:"+align2);

	// add a function to return the polarity of the output range
	plugin.scale.polarity = function() { var range=this.range(); return (range[0] < range[1]) ? 1 : -1; };

	// return the scaled output, but in degrees instead of the default radians
	plugin.scale.degrees = function(value) { return this(value) * 180 / Math.PI; };

	// set the lane_request so new plugin can access the lane container
	plugin.lane = lane;
	plugin.alignment = lane_request.alignment;

	// add plugin to lane
	lane.controls.push(plugin);

	return lane;
};

Dial.prototype.plugin = function(name, klass)
{
	var lane;
	this[name] = this.plugins[name] = klass;
	klass.name = name;

	if(klass.options) {
		if(klass.options.arcrange)
			klass.arcrange = klass.options.arcrange;
	}

	if(klass.options && klass.options.lane) {
		// this is a special control that attaches to lanes inside or outside the dial
		lane = this.attachToLane(klass, klass.options.lane);

		// determine the parent container
		var parent = klass.options.parent ? klass.options.parent : lane.container;

		// add a new container for the plugin
		klass.container = parent
			.append("g")
			.attr("id", klass.id ? klass.id : name)
			.attr("class","plugin plugin-"+klass.constructor.name.toLowerCase()
				+(klass.options.class ? " "+klass.options.class : "")
				+(klass.options.type ? " "+klass.options.type+"-indicator" : "")
			);
	} else {
		// create the plugins group if not already created (holds all plugins that arent in lanes)
		if(!this.controls.groups.plugins)
			this.controls.groups.plugins = this.svg
				.append("g")
				.attr("class","plugins");

		// create a container for this plugin
		klass.container = this.controls.plugins[name] = this.controls.groups.plugins
			.append("g")
			.attr("id", name)
			.attr("class","plugin plugin-"+klass.constructor.name);

		klass.container = this;
	}

	// add some properties to the plugin
	klass.svg = this.svg;
	if(!klass.controls) klass.controls = {};

	if(typeof klass.attach ==="function")
		klass.attach(lane);
};


// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    	dial: function(options) {
    		//return this.each(function() {
    			var dial = new Dial($(this), options);
				return dial;
			//});
		}
	});
