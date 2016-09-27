

$(function() {
	var dialDefaults = {
		// none so far
	}
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

var __glyphs = [
		"M -20 10 L 0 -10 L 20 10",
		"M -20 -10 L 0 10 L 20 -10"
	]
function glyph(id, parent, radius, angle, scale, offset)
{
	var pos = polar2rect(radius, angle, offset)
	return parent.append("path")
		.attr("class","glyph")
		.attr("d",__glyphs[id])
		.attr("stroke-width","4")
		.attr("transform","translate("+pos.x+","+pos.y+") "+((scale!=1.0)?" scale("+scale+")":""));
}

function Dial(_container) {

	this.container = $(_container);
	var _this = this;

	//var svgbase = '<g class="dial"><g class="ticks"><g class="background-ticks" /></g></g>';
	//dial.svgroot.html( svgbase );
	var data = [10, 20, 30, 40, 50];
	var extents = this.extents = {width: 640, height: 640};
	var width = this.width = 550;
	var height = this.height = 450;
	var radius = this.radius = extents.height / 2;
	var center = this.center = {x: extents.width - radius, y: extents.height / 2};

	var radians = radians = 1.7 * Math.PI;
	var dial_button_space = 0.18 * Math.PI;
	var dial_begin = -Math.PI + dial_button_space;
	var dial_end = -dial_begin;// + 0.1*Math.PI;

	this.scales = {
		speed: d3.scaleLinear()
			.domain([1, 10])
			.range([dial_begin, dial_end])
	};

	this.container.html("");
	var svg = d3.select(this.container[0]).append("svg")
		.attr("width", this.width)
		.attr("height", this.height)
		.attr("viewBox", "0 0 " + extents.width + " " + extents.height);

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

	var ticks = svg.append("g")
		.attr("class", "ticks");
	var bgticks = ticks.append("g")
		.attr("class", "background-ticks");
	var indicators = ticks.append("g")
		.attr("class", "indicators");
	var buttons = ticks.append("g")
		.attr("class", "buttons");

	// give radius positions of control parts
	this.radii = {
		ticks: {inner: radius - radius * 0.24, outer: radius - 5}
	};

	var N = 160;
	var dxAngle = 2 * Math.PI / N;
	this.arcs = {};
	var tickArc = this.arcs.ticks = d3.arc()
		.startAngle(function (d, h) {
			return d - h;
		})
		.endAngle(function (d, h) {
			return d + h;
		})
		.innerRadius(this.radii.ticks.inner)
		.outerRadius(this.radii.ticks.outer);
	var bigTickArc = d3.arc()
		.startAngle(function (d, h) {
			return d - h * 3;
		})
		.endAngle(function (d, h) {
			return d + h * 3;
		})
		.innerRadius(radius - radius * 0.24)
		.outerRadius(radius - 5);
	var innerButtonArc = d3.arc()
		.startAngle(function (a, h) {
			return a;
		})
		.endAngle(function (a, h) {
			return h;
		})
		.innerRadius(radius - radius * 0.28)
		.outerRadius(radius);
	var outerButtonArc = d3.arc()
		.startAngle(function (a, h) {
			return a;
		})
		.endAngle(function (a, h) {
			return h;
		})
		.innerRadius(radius + 20)
		.outerRadius(radius + radius * 0.17);


	var ang = Math.PI * 0.82;
	var divisor = 9;
	var divisorAngle = this.divisorAngle = ang * 2 / divisor;

	// speed ticks
	var tick_points = this.scales.speed.ticks(this.scales.speed.domain()[1]*10);
	var ticks = bgticks
		.selectAll(".tick")
		.data(tick_points)
		.enter()
			.append("path")
			.attr("class", function (d, i) { return (d == Math.floor(d)) ? "tick major" : "tick"; })
			.attr("transform", "translate(" + center.x + "," + center.y + ")")
			.attr("d", function (d, i) {
				return (d == Math.floor(d))
					? bigTickArc(_this.scales.speed(d), dxAngle * 0.1)
					: tickArc(_this.scales.speed(d), dxAngle * 0.1);
			});

	// dial speed number labels
	var ticks = bgticks
		.selectAll(".dial-ordinals")
		.data(this.scales.speed.ticks())
		.enter()
			.append("text")
			.filter(function(d) { return d!=1 && d!=9; })
			.attr("class", "dial-ordinals")
			.attr("text-anchor", "middle")
			.attr("x", center.x)
			.attr("y", center.y - radius * 0.80)
			.attr("transform", function(d,i) { return "rotate(" + (((d - divisor / 2 - 0.5) * divisorAngle ) * 180 / Math.PI) + "," + center.x + "," + center.y + ")"; })
			.text(function(d,i) { return d; });

	// current speed indicator
	this.defaultTranslate="translate("+center.x+","+center.y+")";
	indicators.append("path")
		.attr("class","current-speed-indicator")
		.attr("d", bigTickArc(0.18*Math.PI, dxAngle*0.3) )
		.attr("transform",this.defaultTranslate+" rotate("+(2*this.divisorAngle*180/Math.PI)+")");


	// inner buttons - faster/slower
	buttons.append("path")
		.attr("id","speed-increase")
		.attr("class","inner speed-increase")
		.attr("d", innerButtonArc(ang+dxAngle, Math.PI-0.01))
		.attr("transform","translate("+center.x+","+center.y+")");
	buttons.append("path")
		.attr("id","speed-decrease")
		.attr("class","inner speed-decrease")
		.attr("d", innerButtonArc(Math.PI+0.01, 2*Math.PI-ang-dxAngle))
		.attr("transform","translate("+center.x+","+center.y+")");
	// button glyphs
	glyph(0, buttons, radius*0.87, Math.PI-(Math.PI-ang)/2, 1.0, center);
	glyph(1, buttons, radius*0.87, Math.PI+(Math.PI-ang)/2, 1.0, center);

	// outer buttons - incline/decline
	var incdec_rotation = 1.35;
	var incdec_width = 0.03;
	buttons.append("path")
		.attr("class","incline-background")
		.attr("d", outerButtonArc(1.2*Math.PI, 1.65*Math.PI))
		.attr("transform","translate("+center.x+","+center.y+")");
	buttons.append("path")
		.attr("class","incline-indicator")
		.attr("d", outerButtonArc((incdec_rotation-incdec_width)*Math.PI, incdec_rotation*Math.PI-0.01))
		.attr("transform","translate("+center.x+","+center.y+")");

	// speed indicator
	var status = svg.append("g")
		.attr("class","status");
	status.append("text")
		.attr("class","status-indicator")
		.attr("text-anchor","middle")
		.attr("x",center.x)
		.attr("y",center.y-140)
		.text("...");
	status.append("text")
		.attr("class","running-time")
		.attr("text-anchor","middle")
		.attr("x",center.x)
		.attr("y",center.y-100)
		.text("0:00");
	status.append("text")
		.attr("class","speed-indicator")
		.attr("text-anchor","middle")
		.attr("x",center.x)
		.attr("y",center.y+70)
		.text("");
	
	// goal indicator
	var goalAngle = { begin: 2*Math.PI-ang-dxAngle, end: 2*Math.PI+ang+dxAngle };
	this.arcs.goal = d3.arc()
		.startAngle(function(a,h) { return goalAngle.begin; })
		.endAngle(function(a,h) { return goalAngle.begin + (goalAngle.end-goalAngle.begin)*h; })
		.innerRadius(radius-radius*0.245-10)
		.outerRadius(radius-radius*0.245-5);
	indicators.append("path")
		.attr("id","goal")
		.attr("class","goal")
		.attr("d", this.arcs.goal(0, 0.25))
		.attr("transform","translate("+center.x+","+center.y+")");


	this.container.on("click",function(){
		_this.click(event.layerX, event.layerY);
	});
}

Dial.prototype.setSpeed = function(speed)
{
	var ctrl = this.container.find(".indicators .current-speed-indicator");
	if(speed>2)
	{
		var val = this.scales.speed(speed-1) *180/Math.PI;
		console.log("speed "+speed+"="+val);
		ctrl.attr("style","");
		ctrl.attr("transform",this.defaultTranslate+" rotate("+val+")");
	} else {
		ctrl.attr("style","display:none");
	}
};

Dial.prototype.setRunningTime = function(seconds,minutes,hours)
{
	var percent = Math.min(1.0, (seconds+minutes*60+hours*3600) / this.treadmill.goaltime);
	this.container.find(".indicators .goal")
		.attr("d", this.arcs.goal(0, percent));
};

Dial.prototype.click = function(x,y)
{
	var scale = { 
		x: (this.width / this.extents.width), 
		y: (this.height / this.extents.height) 
	};
	var x1=x/scale.x - this.center.x, 
	    y1=y/scale.y - this.center.y;
	var angle = Math.atan2(y1,x1), 
	    radius = Math.sqrt(x1*x1 + y1*y1);
	console.log("click @ "+x1+":"+y1+"   a:"+(angle*180/Math.PI)+"  r:"+radius);
	if(radius > this.radii.ticks.inner && radius < this.radii.ticks.outer) {
		console.log("speed "+angle+"  "+this.radii.ticks.inner+" < "+radius+" < "+this.radii.ticks.outer);
	}
};

// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    	dial: function() {
    		//return this.each(function() {
    			var dial = new Dial($(this));
				return dial;
			//});
		}
	});
