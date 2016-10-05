/**
 * Created by colinmackenzie on 10/5/16.
 */


function GraduatedIndicator(options)
{
    this.options = {
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
        $.extend(this.options, options);
}
GraduatedIndicator.prototype = new DialIndicator();


GraduatedIndicator.prototype.attach = function(lane)
{
    //DialIndicator.prototype.attach.call(this, lane);
    var _this = this;

    var center = lane.dial.center;

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

    // inner buttons - faster/slower
    // TODO: We can use the range to determine our buttons in this way
    // but when this becomes a ButtonIndicator then we need to get smarter
    var speedRange = this.scale.range();
    speedRange[0] -= 0.03; 	speedRange[1] += 0.03;
    this.controls.increment = lane.dial.controls.groups.buttons.append("path")
        .attr("id","speed-increase")
        .attr("class","inner speed-increase")
        .attr("d", lane.arc(speedRange[1], Math.PI-0.01, { inner: -12, outer: 4 }))
        .attr("transform","translate("+center.x+","+center.y+")");
    this.controls.decrement = lane.dial.controls.groups.buttons.append("path")
        .attr("id","speed-decrease")
        .attr("class","inner speed-decrease")
        .attr("d", lane.arc(speedRange[0], -Math.PI+0.01, { inner: -12, outer: 4 }))
        .attr("transform","translate("+center.x+","+center.y+")");
    // button glyphs
    glyph(0, lane.dial.controls.groups.buttons, lane.offset+lane.width/2, Math.PI-(Math.PI-speedRange[1])/2, 1.0, center);
    glyph(1, lane.dial.controls.groups.buttons, lane.offset+lane.width/2, Math.PI+(Math.PI-speedRange[1])/2, 1.0, center);
};

GraduatedIndicator.prototype.set = function(value, transition)
{
    // our scale is in radians, so we must convert it to degrees for the transform attribute
    var degrees = this.scale(value) * 180 / Math.PI;
    if(transition==true) transition=1000;
    (transition ? this.controls.indicator.transition().duration(transition) : this.controls.indicator)
        .attr("fill-opacity", (value>2) ? "1" : "0")	// fade in/out when we transition between stopped and running
        .attr("transform", "translate(" + this.lane.dial.center.x + "," + this.lane.dial.center.y + ") rotate(" + degrees + ")");
};
