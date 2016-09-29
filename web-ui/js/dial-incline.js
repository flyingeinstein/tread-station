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
    //console.log(this);
}

DialIncline.prototype.attach = function(lane)
{
    //console.log("attached to ", lane);
    //var radius = this.lane.dial.radii.outer + 20;
    var center = this.lane.dial.center;
    var target = this.lane.targets.current;
    var range = this.scale.range();

    // background
    this.lane.container.append("path")
        .attr("class","incline-background")
        .attr("d", this.lane.arc(range[0], range[1]))
        .attr("transform","translate("+center.x+","+center.y+")");

    // current target
    this.controls.indicator = this.lane.container.append("path")
        .attr("class","incline-indicator")
        .attr("d", this.lane.arc(-target.width, target.width))
        .attr("transform","translate("+center.x+","+center.y+") rotate("+this.scale.degrees(target.value)+")");
};

DialIncline.prototype.set = function(value)
{
    this.lane.targets.current.value = value;
    var center = this.lane.dial.center;

    // update current target
    this.controls.indicator
        .transition().duration(1000)
        .attr("transform","translate("+center.x+","+center.y+") rotate(" + this.scale.degrees(value) + ")");
};