/**
 * Created by colin on 9/13/2016.
 */


$(function() {
    var dialDefaults = {
        // none so far
    }
});


function SonarSlider(_container)
{
    this.container = $(_container);

    var data = [10, 20, 30, 40, 50];
    var width = this.width = 550;
    var height = this.height = 450;
    var radius = this.radius = extents.height / 2;
    var center = this.center = {x: extents.width - radius, y: extents.height / 2};

    this.container.html("");
    var svg = d3.select(this.container[0]).append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("viewBox", "0 0 " + extents.width + " " + extents.height);

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

    var outline = svg.append("g")
        .attr("class","outline");
    var history = ticks.append("g")
        .attr("class","history");

    outline.enter().append("rect")
        .attr("x",function(d,i) { return x(0); })
        .attr("width",function(d) { return x(d.value) - x(0); })
        .attr("height",y.rangeBand())
        .attr("y",function(d) { return y(d.name); })
}