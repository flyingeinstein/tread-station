/**
 * Created by colin on 9/13/2016.
 *
 * TODO:
 *   1. DONE Use domain/range to convert sonar units to pixels
 *   2. Make the time expiration more efficient using transitions
 *   3. DONE Add getter/setter methods for these operations and refactor out the mouse clicking
 *         a. get/setTarget but also handle via mouse click event
 *         b. addMeasurement
 *   4. Add labels to target
 *   5. Can we add labels to historical clusters?
 *   6. integrate with main project --==>
 *
 */


$(function() {
    var sonarSliderDefaults = {
        // none so far
    }
});


function SonarSlider(_container) {
    this.container = $(_container);


    // the extents of the treadmill range in sonar units
    this.extents = {min: 0.0, max: 100.0};

    // the target walker position in sonar units
    this.target = 0.2;
    this.targets = [{name: "set", value: this.target}];

    this.options = {};
    this.controls = {};
    this.groups = {};
    this.dispatch = d3.dispatch("current", "target", "change");

    var slider = this;

    // control measurements
    this.options = {
        // width and height of outer control
        width: 40,
        height: 450,

        outline: {
            border: 5, width: 16
            // height: determined by formula
        },
        history: {
            color: "cyan",
            stroke: 3,
            border: 3,
//            blur: 2,
            gooey: 5,
            expiration: 10000
        }
    };

    this.unitScale = d3.scaleLinear()
        .domain([0,1])
        .range([0,this.options.height - this.options.outline.border*2 ]);

    this.container.html("");
    var svg = this.svg = d3.select(this.container[0]).append("svg")
        .attr("width", this.options.width)
        .attr("height", this.options.height)
        .attr("viewBox", "0 0 " + this.options.width + " " + this.options.height);

    var defs = svg.append('defs');
    var filter=null;

    // setup the history blur
    if(this.options.history.blur || this.options.history.gooey) {
        var gStdDev = this.options.history.blur ? this.options.history.blur : this.options.history.gooey;
        filter = defs.append("filter").attr("id", "gooey");
        filter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", gStdDev)
            .attr('result', 'blur');
        if (this.options.history.gooey) {
            filter.append('feColorMatrix')
                .attr('in', 'blur')
                .attr('mode', 'matrix')
                .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -3')
                .attr('result', 'gooey');
/*            filter.append('feComposite')
                .attr('in', 'SourceGraphic')
                .attr('in2', 'gooey')
                .attr('operator', 'atop');*/
        }
    }

    var bg = svg.append("g")
        .attr("class", "background");
    /*bg.append("circle")
        .attr("class", "background-circle")
        .attr("cx", center.x)
        .attr("cy", center.y)
        .attr("r", radius)
        .attr("filter", "url(#fe3)")
    ;*/

    this.controls.outline = svg.append("g")
        .attr("class", "outline");
    this.groups.history = this.controls.outline.append("g")
        .attr("class", "history");
    if(filter)
        this.groups.history.style("filter", "url(#gooey)"); //Set the filter on the container svg

    var now = Number(new Date());
    this.history = [
        { time: now-2000, value: 0.2 },
        { time: now-3000, value: 0.21 },
        { time: now-6000, value: 0.22 },
        { time: now-7000, value: 0.24 },
        { time: now-9000, value: 0.67 },
        { time: now-12000, value: 0.678 },
        { time: now-14000, value: 0.69 },
        { time: now-17000, value: 0.74 }
    ];


    this.controls.outline
        .append("rect")
        .attr("stroke", "white")
        .attr("fill", "none")
        .attr("rx", 10).attr("ry", 10)
        .attr("x", slider.options.outline.border)
        .attr("y", slider.options.outline.border)
        .attr("width", slider.options.outline.width)
        .attr("height", slider.options.height - slider.options.outline.border*2);


    // historical lines
    this.controls.history = this.groups.history
        .selectAll("g.historical-line")
        .data(this.history, function(d) { return d.time; });



    this.updateVis();

    svg.on("click",function(){
        slider.click(d3.mouse(svg.node()));
    });

    setInterval(function() { slider.updateVis()}, 250);
}

SonarSlider.prototype.updateVis = function()
{
    var slider = this;
    var now = Number(new Date());

    // current set/balance position
    this.controls.targets = this.controls.outline
        .selectAll("g.target")
        .data(this.targets);
    this.controls.targets
        .enter()
            .append("g")
            .attr("class","target")
            .attr("id", function(d) { return "target-"+d.name; })
            .attr("transform", "translate(20, 20)" )
            .append("polygon")
                .attr("fill", "white")
                .attr("points", "10,0 0,5 10,10");
            //.merge(this.controls.targets);
    this.controls.targets
        .transition()
        .attr("transform",function(d) { return "translate(20, "+slider.unitToPixel(d.value)+")"; } );

    this.history = this.history.filter(function(e) { return (now - e.time)<slider.options.history.expiration; });
    this.controls.history = this.groups.history
        .selectAll(".historical-line")
        .data(this.history, function(d) { return d.time; });
    this.controls.history
        .enter()
        .append("line")
        .attr("class", "historical-line")
        .attr("id", function(d) { return "hl-"+d.time; })
        .attr("stroke", this.options.history.color)
        .attr("stroke-width", this.options.history.stroke)
        .style("stroke-opacity", 1.0)
        .attr("x1", this.options.outline.border + this.options.history.border)
        .attr("x2", this.options.outline.border + this.options.outline.width - this.options.history.border)
        .attr("y1", function(d) { return slider.unitToPixel(d.value); })
        .attr("y2", function(d) { return slider.unitToPixel(d.value); });
    this.controls.history
        .exit()
        //.transition()
        //.style("stroke-opacity", 0.0)
        .remove();
    this.controls.history
        .transition()
        .style("stroke-opacity", function(d) { return 1.0 - (now-d.time)/slider.options.history.expiration; });

};

SonarSlider.prototype.setCurrent = function(val) {
    var now = Number(new Date());
    this.current = { time: now, value:val };
    slider.history.push(this.current);
    this.updateVis();
};

SonarSlider.prototype.getCurrent = function() {
    return this.current;
};

SonarSlider.prototype.setTarget = function(value, ordinal) {
    if(arguments.length<2)
        ordinal = 0;
    this.targets[ordinal].value = value;
    this.updateVis();
};

SonarSlider.prototype.getTarget = function(ordinal) {
    if(arguments.length<1)
        ordinal = 0;
    return this.targets[ordinal].value;
};


SonarSlider.prototype.on = function(name, callback) {
  /*  console.log(this.dispatch);
    console.log(arguments);
  return this.dispatch.on.apply(this, arguments);*/
    this.dispatch.on(name, callback);
};

SonarSlider.prototype.pixelToUnit = function(y)
{
    return this.unitScale.invert(y - this.options.outline.border);
};

SonarSlider.prototype.unitToPixel = function(u)
{
    return this.unitScale(u) + this.options.outline.border;
};

SonarSlider.prototype.click = function(mouse)
{
    var val = this.pixelToUnit(mouse[1]);
    this.setTarget(val);
    this.dispatch.call("change", this, mouse, val);
    this.updateVis();
};

// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    sonarSlider: function() {
        var slider = new SonarSlider($(this));
        return slider;
    }
});