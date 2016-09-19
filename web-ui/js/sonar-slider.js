/**
 * Created by colin on 9/13/2016.
 *
 * TODO:
 *   1. DONE Use domain/range to convert sonar units to pixels
 *   2. DONE Make the time expiration more efficient using transitions
 *   3. DONE Add getter/setter methods for these operations and refactor out the mouse clicking
 *         a. get/setTarget but also handle via mouse click event
 *         b. addMeasurement
 *   4. Add labels to target
 *   5. Can we add labels to historical clusters?
 *   6. integrate with main project --==>
 *
 */


function SonarSlider(_container) {
    this.container = $(_container);

    // track global number of sonar sliders
    // we may need to produce unique names for things like filters
    if(SonarSlider.prototype.instanceCount)
        SonarSlider.prototype.instanceCount++;
    else
        SonarSlider.prototype.instanceCount=1;
    this.instanceNumber = SonarSlider.prototype.instanceCount;

    // the extents of the treadmill range in sonar units
    this.extents = {min: 0.0, max: 100.0};

    // the target walker position in sonar units
    this.target = 0.5;
    this.targets = [{name: "set", value: this.target}];

    this.options = {};
    this.controls = {};
    this.groups = {};
    this.dispatch = d3.dispatch("current", "target", "change");

    var slider = this;

    // control measurements
    this.options = {
        // width and height of outer control
        width: 60,
        height: 450,

        outline: {
            border: 5, width: 24
            // height: determined by formula
        },
        history: {
            color: "cyan",
            stroke: 2,
            border: 6,
            blur: 4,
            //gooey: 5,
            expiration: 3000,
            limit: 75
        }
    };

    var user_options_object = this.container.data("options");
    if(user_options_object) {
        console.log(user_options_object);
        this.user_options = window[user_options_object];
        if(this.user_options) {
            this.options = $.extend(true, {}, this.options, this.user_options);
        }
    }
    console.log(this.options);

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
    var filterid = "gooey"+this.instanceNumber;
    console.log(filterid);

    // setup the history blur
    if(this.options.history.blur || this.options.history.gooey) {
        var gStdDev = this.options.history.blur ? this.options.history.blur : this.options.history.gooey;
        filter = defs.append("filter").attr("id", filterid);
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
        this.groups.history.style("filter", "url(#"+filterid+")"); //Set the filter on the container svg

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
        .attr("x", this.options.outline.border)
        .attr("y", this.options.outline.border)
        .attr("width", this.options.outline.width)
        .attr("height", this.options.height - this.options.outline.border*2);


    // historical lines
    this.controls.history = this.groups.history
        .selectAll("g.historical-line")
        .data(this.history, function(d) { return d.time; });



    this.updateTargets();
    this.updateHistory();

    svg.on("click",function(){
        slider.click(d3.mouse(svg.node()));
    });
}

SonarSlider.prototype.getMetrics = function() {
    return {
        outline: {
            left: this.options.outline.border,
            right: this.options.outline.border + this.options.outline.width,
            top: this.options.outline.border,
            bottom: this.options.outline.border + this.options.outline.height
        }
    };
};

SonarSlider.prototype.updateTargets = function()
{
    var slider = this;
    var metrics = this.getMetrics();
    var now = Number(new Date());

    // update target glyphs
    this.controls.targets = this.controls.outline
        .selectAll("g.target")
        .data(this.targets);
    this.controls.targets
        .enter()
            .append("g")
            .attr("class","target")
            .attr("id", function(d) { return "target-"+d.name; })
            .attr("transform", function(d) { return "translate("+metrics.outline.right+", "+slider.unitToPixel(d.value)+")"; } )
            .append("polygon")
                .attr("fill", "white")
                .attr("points", "10,0 0,5 10,10");
    this.controls.targets
        .transition()
        .attr("transform",function(d) { return "translate("+metrics.outline.right+", "+slider.unitToPixel(d.value)+")"; } );
};

SonarSlider.prototype.updateHistory = function()
{
    var slider = this;
    var now = Number(new Date());

    var metrics = this.getMetrics();
    metrics.outline.left += this.options.history.border;
    metrics.outline.right -= this.options.history.border;

    // update history
    //this.history = this.history.filter(function(e) { return (now - e.time)<slider.options.history.expiration; });
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
        .attr("x1", metrics.outline.left)
        .attr("x2", metrics.outline.right)
        .attr("y1", function(d) { return slider.unitToPixel(d.value); })
        .attr("y2", function(d) { return slider.unitToPixel(d.value); })
        .style("stroke-opacity", 1.0)
        .transition().duration(3000)
        .style("stroke-opacity", 0.0);
    this.controls.history
        .exit()
        .remove();
};

SonarSlider.prototype.setCurrent = function(val) {
    var now = Number(new Date());
    this.current = { time: now, value:val };

    // add to history
    this.history.push(this.current);

    // limit history to N elements
    while(this.history.length > this.options.history.limit)
        this.history.shift();

    // update visualization
    this.updateHistory();
};

SonarSlider.prototype.getCurrent = function() {
    return this.current;
};

SonarSlider.prototype.setTarget = function(value, ordinal) {
    if(arguments.length<2)
        ordinal = 0;
    this.targets[ordinal].value = value;
    this.updateTargets();
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

SonarSlider.prototype.mouse = function()
{
    return d3.mouse(this.svg.node());
}

SonarSlider.prototype.click = function(mouse)
{
    var val = this.pixelToUnit(mouse[1]);
    this.setTarget(val);
    this.dispatch.call("change", this, mouse, val);
    //this.updateTargets();
};

// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    sonarSlider: function() {
        return new SonarSlider($(this));
    }
});