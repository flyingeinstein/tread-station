/**
 * Created by colinmackenzie on 9/28/16.
 */


function DialIncline(options)
{
    this.lane = {
        ordinal: 1,
        alignment: 'right'
    };
    $.extend(this.lane, options);
    console.log(this);
}

DialIncline.prototype.attach = function(lane)
{
    console.log("attached to ", lane);
    console.log(this);

    var radius = this.lane.dial.radii.outer + 20;
    var center = this.lane.dial.center;

    var target = this.lane.targets.current;
    var extents = [ lane.scale(0), lane.scale(1)];
    var width = 0.02;
    var degrees = this.lane.scale(target.value) * 180 / Math.PI;

    this.lane.container.append("path")
        .attr("class","incline-background")
        .attr("d", this.lane.arc(extents[0], extents[1]))
        .attr("transform","translate("+center.x+","+center.y+")");
    this.controls.indicator = this.lane.container.append("path")
        .attr("class","incline-indicator")
        .attr("d", this.lane.arc(-width, width))
        .attr("transform","translate("+center.x+","+center.y+") rotate("+degrees+")");
};

DialIncline.prototype.set = function(value)
{
    this.lane.targets.current.value = value;
    var degrees = this.lane.scale(value) * 180 / Math.PI;
    var center = this.lane.dial.center;

    this.controls.indicator
        .transition().duration(1000)
        .attr("transform","translate("+center.x+","+center.y+") rotate(" + degrees + ")");
};