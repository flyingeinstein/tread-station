/**
 * Created by colin on 9/13/2016.
 *
 * TODO:
 *   1. DONE Use domain/range to convert sonar units to pixels
 *   2. DONE Make the time expiration more efficient using transitions
 *   3. DONE Add getter/setter methods for these operations and refactor out the mouse clicking
 *         a. get/setTarget but also handle via mouse click event
 *         b. addMeasurement
 *   4. DONE Add labels to target
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

    this.options = {};
    this.controls = {};
    this.groups = {};
    this.dispatch = d3.dispatch("current", "target", "change");

    var slider = this;

    // control measurements
    this.options = {
        // width and height of outer control
        width: 80,
        height: 450,

        decimals: 2,

        sonar: {
            range: [0,1]
        },
        outline: {
            border: 5, width: 24,
            color: "#444",
            fill: "none",
            opacity: 1.0
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
        },
        targets: {
            set: {
                color: "cyan"
            },
            current: {
                color: "gray"
            }
        }
    };

    // merge any user supplied options if found
    var user_options_object = this.container.data("options");
    if(user_options_object) {
        this.user_options = window[user_options_object];
        if(this.user_options) {
            this.options = $.extend(true, {}, this.options, this.user_options);
        }
    }

    // the target walker position in sonar units
    this.target = 0.5;
    this.current = 0.3;
    this.targets = [
        {
            name: "set",
            decimals:this.options.decimals,
            value: this.target,
            color: this.options.targets.set.color,
            points: "10,-5 0,0 10,5"
        },
        {
            name: "current",
            decimals:this.options.decimals,
            value: this.current,
            color: this.options.targets.current.color,
            //points: "-10,-5 0,0 7,0 0,0 -10,5"
            //points: "-4,0 8,0"
            points: "-4,0 8,0 8,-4 -4,0"

        }
    ];

    // build the scale of units between sonar range and visual pixels
    this.unitScale = d3.scaleLinear()
        .domain(this.options.sonar.range)
        .range([0,this.options.height - this.options.outline.border*2 ]);

    // create our SVG container
    this.container.html("");
    var svg = this.svg = d3.select(this.container[0]).append("svg")
        .attr("width", this.options.width)
        .attr("height", this.options.height)
        .attr("viewBox", "0 0 " + this.options.width + " " + this.options.height);

    // build our historical data visualization SVG filter
    var filter=null;
    var filterid = "gooey"+this.instanceNumber;
    var defs = svg.append('defs');

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

    this.controls.outline
        .append("rect")
        .attr("stroke", this.options.outline.color)
        .attr("fill", this.options.outline.fill)
        .attr("opacity", this.options.outline.opacity)
        .attr("rx", 10).attr("ry", 10)
        .attr("x", this.options.outline.border)
        .attr("y", this.options.outline.border)
        .attr("width", this.options.outline.width)
        .attr("height", this.options.height - this.options.outline.border*2);

    // create historical
    this.history = [];
    this.groups.history = this.controls.outline.append("g")
        .attr("class", "history");
    if(filter)
        this.groups.history.style("filter", "url(#"+filterid+")"); //Set the filter on the container svg


    // historical lines
    this.controls.history = this.groups.history
        .selectAll("g.historical-line")
        .data(this.history, function(d) { return d.time; });

    // out of range indicator
    var metrics = this.getMetrics();
    var radius = 4;
    this.controls.outOfRangeIndicator = this.controls.outline
        .append("circle")
        .attr("fill", "yellow")
        .attr("r", radius)
        .attr("cx", metrics.outline.cx )
        .attr("cy", metrics.outline.bottom - radius - 6)
        .style("opacity", 0.0);

    // update the view
    this.updateTargets();
    this.updateHistory();

    // hide the current value
    this.svg.select("#target-current").style("opacity", 0.0);

    // clicking in the slider area sets the target position
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
            bottom: this.options.height - this.options.outline.border,
            cx: this.options.outline.border + this.options.outline.width/2,
            cy: this.options.outline.border + this.options.outline.width/2
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
        .enter().append("g")
            .attr("class","target")
            .attr("id", function(d) { return "target-"+d.name; })
            .attr("transform", function(d) { return "translate("+metrics.outline.right+", "+slider.unitToPixel(d.value)+")"; } )
        .call(function(root) {
            root.append("polygon")
                .attr("fill", function(d) { return d.color; })
                .attr("stroke", function(d) { return d.color; })
                .attr("stroke-width", 1)
                .attr("points", function(d) { return d.points; });
            root.append("text")
                .attr("x", 13)
                .attr("y", 3)
                .attr("font-family", "calibri")
                .attr("font-size", "11px")
                .attr("fill", "gray")
                .text(function(d) { return d.value.toFixed(d.decimals); });
        });
    this.controls.targets
        .transition()
        .attr("transform",function(d) { return "translate("+metrics.outline.right+", "+slider.unitToPixel(d.value)+")"; } );
    this.controls.targets.selectAll("text")
        .text(function(d) { return d.value.toFixed(d.decimals); });
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
    var metrics = this.getMetrics();

    this.current = val;
    this.targets[1].value = this.current;

    // update visual style of current pointer
    this.svg.select("#target-current text")
        .text(this.current.toFixed(this.targets[1].decimals) );

    this.svg.select("#target-current")
        .attr("transform", "translate("+metrics.outline.right+", "+this.unitToPixel(this.current)+")" )
        .transition().duration(1000)
        .styleTween("opacity", function() { return d3.interpolate(1.0, 0.0); });

    // add to history
    this.history.push({ time:now, value: this.current });

    // limit history to N elements
    while(this.history.length > this.options.history.limit)
        this.history.shift();

    // update visualization
    this.updateHistory();

    // update out-of-range indicator
    this.outOfRange(this.current > this.options.sonar.range[1]);
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
    //this.setTarget(val);
    this.dispatch.call("change", this, mouse, val);
    //this.updateTargets();
};

SonarSlider.prototype.error = function(code) {
    var metrics = this.getMetrics();
    var radius = 6;
    this.controls.outline
        .append("circle")
        .attr("fill", "red")
        .attr("r", radius)
        .attr("cx", metrics.outline.cx )
        .attr("cy", metrics.outline.bottom - radius - 6)
        .style("opacity", 1.0)
        .transition().delay(400).duration(400)
        .style("opacity", 0.0)
        .remove();
};

SonarSlider.prototype.outOfRange = function(isOutOfRange) {
    this.controls.outOfRangeIndicator
        .style("opacity", isOutOfRange ? 1.0 : 0.0)
};

// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    sonarSlider: function() {
        return new SonarSlider($(this));
    }
});