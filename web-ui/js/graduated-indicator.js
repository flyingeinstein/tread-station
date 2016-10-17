/**
 * Created by colinmackenzie on 10/5/16.
 */



function GraduatedIndicator(options)
{
    DialIndicator.call(this);
    var default_options = {
        lane: {
            ordinal: 1,
            alignment: 'right'
        },
        background: {
        },
        ticks: {
          color: {
              fill: 'white'
          }
        },
        indicator: {
            color: {
                fill: 'white'
            }
        }
    };
    if(options)
        $.extend(this.options ? this.options : {}, default_options, options);
}
GraduatedIndicator.prototype = new DialIndicator();


GraduatedIndicator.prototype.attach = function(lane)
{
    //DialIndicator.prototype.attach.call(this, lane);
    var _this = this;

    if(this.options.transition==true)
        this.options.transition = 1000;
    if(this.value==null)
        this.value = 0;

    var center = lane.dial.center;
    var buttonInnerMargin = -(lane.dial.lanes.inner.margin + lane.dial.lanes.inner.width);

    // speed ticks
    var tick_points = this.scale.ticks(this.scale.domain()[1]*10);
    var ticks = lane.dial.controls.groups.bgticks
        .selectAll(".tick")
        .data(tick_points)
        .enter()
        .append("path")
        .attr("class", function (d, i) { return (d == Math.floor(d)) ? "tick major" : "tick"; })
        .attr("transform", "translate(" + center.x + "," + center.y + ")")
        .attr("d", function (d, i) {
            var sp = _this.scale(d);
            var dxAngle = ((d == Math.floor(d)) ? 0.015 : 0.003);
            //return _lane.arc(sp-dxAngle, sp+dxAngle);
            return lane.tick(sp, dxAngle);
        });

    // dial speed number labels
    var ticks = lane.dial.controls.groups.bgticks
        .selectAll(".dial-ordinals")
        .data(this.scale.ticks())
        .enter()
        .append("text")
        .filter(function(d) { return d!=1 && d!=9; })
        .attr("class", "dial-ordinals")
        .attr("text-anchor", "middle")
        .attr("font-family", this.options.text.font)
        .attr("font-size", this.options.text.size)
        .attr("x", center.x)
        .attr("y", center.y - lane.dial.radius * 0.80)
        .attr("transform", function(d,i) { return "rotate(" + (_this.scale(d+0.5) * 180 / Math.PI) + "," + center.x + "," + center.y + ")"; })
        .text(function(d,i) { return d; });

    // current speed indicator
    this.controls.indicator = this.container.append("path")
        .attr("class","current-speed-indicator")
        .attr("d", lane.tick(0, 0.024) )
        .attr("fill-opacity", "0")
        .attr("fill", this.options.indicator.color.fill)
        .attr("transform","translate("+center.x+","+center.y+") rotate(0)");
};

GraduatedIndicator.prototype.set = function(value, transition)
{
    // our scale is in radians, so we must convert it to degrees for the transform attribute
    var degrees = this.scale(value) * 180 / Math.PI;
    var indicator =  (this.options.transition)
        ? this.controls.indicator.transition().duration(this.options.transition)
        : this.controls.indicator;
    indicator
        .attr("fill-opacity", (value>2) ? "1" : "0")	// fade in/out when we transition between stopped and running
        .attr("transform", "translate(" + this.lane.dial.center.x + "," + this.lane.dial.center.y + ") rotate(" + degrees + ")");
};
