/**
 * Created by colin on 9/29/2016.
 */


function DialIndicator(options)
{
    this.options = {
        lane: {
            ordinal: 1,
            alignment: 'right'
        },
        background: {
        }
    };
    if(options)
        $.extend(this.options, options);
}

DialIndicator.prototype.attach = function(lane)
{
    //console.log("attached to ", lane);
    //var radius = this.lane.dial.radii.outer + 20;
    var center = this.lane.dial.center;
    var target = this.lane.targets.current;
    var range = this.scale.range();
    var _this = this;

    // background
    if(this.options.background) {
        this.controls.background = this.container.append("path")
            .attr("class", "incline-background")
            .attr("d", this.lane.arc(range[0], range[1]))
            .attr("transform", "translate(" + center.x + "," + center.y + ")");
    }

    // color bands
    if(this.bands) {
        //paint by bands
        /*var domain = this.scale.domain();
        // TODO: assuming here that all domains are positive polarity (doesnt make much sense not to, where ranges can)
        while(domain[0] < domain[1]) {
            for(r=0; r<this.bands.length; r++)
            {
                var band = this.bands[r];

            }
        }*/
        this.bands.controls = this.container
            .selectAll(".band")
            .data(this.bands);
        this.bands.controls
            .enter()
            .append("path")
                .attr("class", "band")
                .attr("fill", function(b,i) { return b.color ? b.color : null; })
                .attr("fill-opacity", function(b,i) { return b.opacity ? b.opacity : 1.0; })
                .attr("d", function(b,i) { return lane.arc(_this.scale(b.range[0]), _this.scale(b.range[1])); })
                .attr("transform", "translate(" + center.x + "," + center.y + ")");
    }

    // current target
    this.controls.indicator = this.container.append("path")
        .attr("class","incline-indicator")
        .attr("d", this.lane.arc(-target.width, target.width))
        .attr("transform","translate("+center.x+","+center.y+") rotate("+this.scale.degrees(target.value)+")");
};

DialIndicator.prototype.set = function(value)
{
    this.lane.targets.current.value = value;
    var center = this.lane.dial.center;

    // update current target
    this.controls.indicator
        .transition().duration(1000)
        .attr("transform","translate("+center.x+","+center.y+") rotate(" + this.scale.degrees(value) + ")");
};