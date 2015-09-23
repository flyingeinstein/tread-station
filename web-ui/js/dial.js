

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

function Dial(_container)
{
	var dial = {
		container: $(_container)
	}
	//var svgbase = '<g class="dial"><g class="ticks"><g class="background-ticks" /></g></g>';
	//dial.svgroot.html( svgbase );
	var data = [10,20,30,40,50];
	var extents = {width: 640, height: 640 };
	var radius = extents.height/2;
	var center = {x: extents.width - radius, y: extents.height/2 };
	console.log(extents, radius, center)
	
	dial.container.html("");
	var svg = d3.select(dial.container[0]).append("svg")
    	.attr("width", 550)
    	.attr("height", 450)
		.attr("viewBox","0 0 "+extents.width+" "+extents.height);

	// add a border
	radius -= 32;
	
	var defs = svg.append("defs");
	var filter = defs.append("filter")
			.attr("id","fe3")
			.attr("x","0")
			.attr("y","0")
			.attr("width","200%")
			.attr("height","200%");
	filter.append("feOffset")
		.attr("result","offOut")
		.attr("in","SourceAlpha")
		.attr("dx","2")
		.attr("dy","2");
	filter.append("feGaussianBlur")
		.attr("result","blurOut")
		.attr("in","offOut")
		.attr("stdDeviation","10");
	filter.append("feBlend")
		.attr("in","SourceGraphic")
		.attr("in2","blurOut")
		.attr("mode","normal");
	filter.append("feComponentTransfer")
		.append("feFuncA")
			.attr("type","linear")
			.attr("slope","0.4");

	
	var bg = svg.append("g")
		.attr("class","background")
	bg.append("circle")
		.attr("class","background-circle")
		.attr("cx",center.x)
		.attr("cy",center.y)
		.attr("r",radius)
		.attr("filter","url(#fe3)")
		;
		
	var ticks = svg.append("g")
		.attr("class","ticks");
	var bgticks = ticks.append("g")
		.attr("class","background-ticks");
	var buttons = ticks.append("g")
		.attr("class","buttons");
		
	var N=160;
	var dxAngle = 2*Math.PI/N;
	console.log(N, dxAngle);
	var tickArc = d3.svg.arc()
		.startAngle(function(d,h) { return a-h; })
		.endAngle(function(d,h) { return a+h; })
		.innerRadius(radius-radius*0.24)
		.outerRadius(radius-5);
	var innerButtonArc = d3.svg.arc()
		.startAngle(function(a,h) { return a; })
		.endAngle(function(a,h) { return h; })
		.innerRadius(radius-radius*0.28)
		.outerRadius(radius);
	var outerButtonArc = d3.svg.arc()
		.startAngle(function(a,h) { return a; })
		.endAngle(function(a,h) { return h; })
		.innerRadius(radius+20)
		.outerRadius(radius+radius*0.17);
	
	
	var ang = Math.PI*0.82;
	for(a=-ang; a<ang; a+=dxAngle)
	{
		bgticks.append("path")
			.attr("d", tickArc(a, dxAngle*0.1))
			.attr("transform","translate("+center.x+","+center.y+")");
	}
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
		
	return dial;
}



// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    	dial: function() {
    		return this.each(function() {
    			var dial = new Dial($(this));
			});
		}
	});
