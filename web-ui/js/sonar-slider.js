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

    this.bounds = {};
    this.controls = {};
    this.groups = {};

    var slider = this;
    var width = this.width = 40;
    var height = this.height = 450;
    var radius = this.radius = this.height / 2;
    var center = this.center = {x: this.width - radius, y: this.height / 2};
    this.bounds.outline =


    this.container.html("");
    var svg = d3.select(this.container[0]).append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("viewBox", "0 0 " + this.width + " " + this.height);

    // add a border
    radius -= 32;

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
    this.groups.history = this.controls.outline.append("g")
        .attr("class", "history");

    var now = Math.floor(new Date() / 1000);
    this.history = [
        { time: now-2, value: 63 },
        { time: now-3, value: 60 },
        { time: now-6, value: 61 },
        { time: now-7, value: 59 },
        { time: now-9, value: 54 },
        { time: now-12, value: 53 },
        { time: now-14, value: 34 },
        { time: now-17, value: 36 }
    ];


    this.controls.outline
        .append("rect")
        .attr("stroke", "white")
        .attr("fill", "none")
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
        .attr("transform",function(d) { return "translate(20, "+d.value+")"; } );

    // historical lines
    this.controls.history = this.groups.history
        .selectAll("g.historical-line")
        .data(this.history);
    this.controls.history
        .enter()
            .append("line")
            .attr("class", "historical-line")
            .attr("id", function(d) { return "hl-"+d.time; })
            .attr("stroke", "gray")
            .attr("stroke-width", 5)
            .attr("x1", 4)
            .attr("x2", 16)
            .attr("y1", function(d) { console.log(d); return 5+d.value; })
            .attr("y2", function(d) { return 5+d.value; });

    /*outline
        .data(history)
        .enter().append("rect")
        .attr("x",function(d,i) { return x(0); })
        .attr("width",function(d) { return x(d.value) - x(0); })
        .attr("height",y.rangeBand())
        .attr("y",function(d) { return y(d.name); })
    */

};

SonarSlider.prototype.scale = function(y)
{
    return 5 y
}

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