/**
 * Created by colin on 9/13/2016.
 *
 * TODO:
 *   1. Use domain/range to convert sonar units to pixels
 *   2. Make the time expiration more efficient using transitions
 *   3. Add getter/setter methods for these operations and refactor out the mouse clicking
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
    this.target = 40;
    this.targets = [{name: "set", value: this.target}];

    this.options = {};
    this.controls = {};
    this.groups = {};

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
            color: "white",
            stroke: 3,
            border: 3,
            blur: 3
        }
    };


    this.container.html("");
    var svg = d3.select(this.container[0]).append("svg")
        .attr("width", this.options.width)
        .attr("height", this.options.height)
        .attr("viewBox", "0 0 " + this.options.width + " " + this.options.height);

    var filter = svg.append("defs")
        .append("filter")
        .attr("id", "blur")
        .append("feGaussianBlur")
        .attr("stdDeviation", this.options.history.blur);

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
        .attr("class", "history")
        .attr("filter", "url(#blur)");

    var now = Math.floor(new Date() / 1000);
    this.history = [
        { time: now-2, value: 0.2 },
        { time: now-3, value: 0.21 },
        { time: now-6, value: 0.22 },
        { time: now-7, value: 0.24 },
        { time: now-9, value: 0.67 },
        { time: now-12, value: 0.678 },
        { time: now-14, value: 0.69 },
        { time: now-17, value: 0.74 }
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

    this.updateVis();

    svg.on("click",function(){
        slider.click(d3.mouse(svg.node()));
    });
}

SonarSlider.prototype.updateVis = function()
{
    var slider = this;

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

    // historical lines
    this.controls.history = this.groups.history
        .selectAll("g.historical-line")
        .data(this.history);
    this.controls.history
        .enter()
            .append("line")
            .attr("class", "historical-line")
            .attr("id", function(d) { return "hl-"+d.time; })
            .attr("stroke", this.options.history.color)
            .attr("stroke-width", this.options.history.stroke)
            .attr("x1", this.options.outline.border + this.options.history.border)
            .attr("x2", this.options.outline.border + this.options.outline.width - this.options.history.border)
            .attr("y1", function(d) { return slider.unitToPixel(d.value); })
            .attr("y2", function(d) { return slider.unitToPixel(d.value); });

};

SonarSlider.prototype.pixelToUnit = function(y)
{
    var range = this.options.height - this.options.outline.border*2;
    var sc= (y - this.options.outline.border) / range;
    if(sc<0) sc = 0; else if(sc>1.0) sc=1.0;
    //console.log("pixelToUnit("+y+") = "+sc);
    return sc;
};

SonarSlider.prototype.unitToPixel = function(u)
{
    var range = this.options.height - this.options.outline.border*2;
    if(sc<0) sc = 0; else if(sc>1.0) sc=1.0;
    var sc= u * range + this.options.outline.border;
    //console.log("unitToPixel("+u+") = "+sc);
    return sc;
};

SonarSlider.prototype.click = function(mouse)
{
    var val = this.pixelToUnit(mouse[1]);
   this.targets[0].value = val; //mouse.y / this.height;
    var now = Math.floor(new Date() / 1000);
    this.history.push({ time: now, value:val });
    this.updateVis();
};

// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    sonarSlider: function() {
        var slider = new SonarSlider($(this));
        return slider;
    }
});