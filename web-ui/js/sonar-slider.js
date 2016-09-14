/**
 * Created by colin on 9/13/2016.
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

    var slider = this;
    var width = this.width = 40;
    var height = this.height = 450;
    var radius = this.radius = this.height / 2;
    var center = this.center = {x: this.width - radius, y: this.height / 2};

    this.controls = {};

    this.container.html("");
    var svg = d3.select(this.container[0]).append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("viewBox", "0 0 " + this.width + " " + this.height);

    // add a border
    radius -= 32;

    /*    var defs = svg.append("defs");
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
     */

    var bg = svg.append("g")
        .attr("class", "background")
    bg.append("circle")
        .attr("class", "background-circle")
        .attr("cx", center.x)
        .attr("cy", center.y)
        .attr("r", radius)
        .attr("filter", "url(#fe3)")
    ;

    this.controls.outline = svg.append("g")
        .attr("class", "outline");
    this.controls.history = this.controls.outline.append("g")
        .attr("class", "history");

    var history = {};


    this.controls.outline
        .append("rect")
        .attr("stroke", "white")
        .attr("rx", 10).attr("ry", 10)
        .attr("x", function (d, i) {
            return 2;
        })
        .attr("width", 16)
        .attr("height", slider.height - 10)
        .attr("y", function (d) {
            return 5;
        });

    this.updateVis();

    svg.on("click",function(){
        slider.click(d3.mouse(svg.node()));
    });
}

SonarSlider.prototype.updateVis = function()
{
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
        .attr("transform",function(d) { console.log(d.value); return "translate(20, "+d.value+")"; } );

    /*outline
        .data(history)
        .enter().append("rect")
        .attr("x",function(d,i) { return x(0); })
        .attr("width",function(d) { return x(d.value) - x(0); })
        .attr("height",y.rangeBand())
        .attr("y",function(d) { return y(d.name); })
    */

};

SonarSlider.prototype.click = function(mouse)
{
   this.targets[0].value = mouse[1]; //mouse.y / this.height;
    this.updateVis();
};

// extend the jQuery class so we can easily create a dial in a control just by calling dial()
jQuery.fn.extend({
    sonarSlider: function() {
        var slider = new SonarSlider($(this));
        return slider;
    }
});