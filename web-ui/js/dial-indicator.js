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
        },
        color: {
            fill: 'white'
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
    if(this.options.background && this.options.background!='none') {
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
    if(this.options.type==null || this.options.type=='tick') {
        this.controls.indicator = this.container.append("path")
            .attr("class", "incline-indicator")
            .attr("d", this.lane.tick(0, target.width))
            .attr("transform", "translate(" + center.x + "," + center.y + ") rotate(" + this.scale.degrees(target.value) + ")");
    } else if (this.options.type=='progress') {
        this.controls.indicator = this.container.append("path")
            .attr("class","goal")   // TODO: this should be generic
            .attr("stroke", this.options.color.stroke)
            .attr("fill", this.options.color.fill)
            .attr("d", lane.arc(this.scale.range()[0], this.scale(0.25)))
            .attr("transform","translate("+center.x+","+center.y+")");
    }
};

DialIndicator.prototype.set = function(value, transition)
{
    var _this = this;
    var oldValue = this.lane.targets.current.value;
    this.lane.targets.current.value = value;
    if(transition==true) transition=1000;
    var indicator = (transition ? this.controls.indicator.transition().duration(transition) : this.controls.indicator);

    // update current target
    if(this.options.type==null || this.options.type=='tick') {
        var center = this.lane.dial.center;
        indicator
            .transition().duration(1000)
            .attr("transform", "translate(" + center.x + "," + center.y + ") rotate(" + this.scale.degrees(value) + ")");
    } else if (this.options.type=='progress') {
        // our local tween function
        var interpolator = d3.interpolate(this.scale(oldValue), this.scale(value));
        function arcTween() {
            return function(t) {
                return _this.lane.arc(_this.scale.range()[0], interpolator(t));
            };
        }

        if(transition)
            indicator.attrTween("d", arcTween);
        else
            indicator.attr("d", this.lane.arc(_this.scale.range()[0], this.scale(value)));
    }
};