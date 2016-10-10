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
            fill: '#2a2a2a'
        },
        color: {
            fill: 'white'
        },

        caption: "",
        text: {
            font: 'arial',
            size: '100px',
            color: 'white'
        }
    };
    if(options)
        this.options = $.extend(true, this.options, options);
}

DialIndicator.prototype.attach = function(lane)
{
    //console.log("attached to ", lane);
    //var radius = this.lane.dial.radii.outer + 20;
    var target = this.lane.targets.current;
    var range = this.scale.range();
    var _this = this;

    /*	WARNING  This arc function copy doesnt work because of the 'this' references in the functions which need to resolve to the above
                 lane object. For this to work, those this references would need to be converted into references on lane.
     this.arc = isNaN(this.options.lane.width)
        ? lane.arc
        : lane.arc.width(this.options.lane.width);*/

    // background
    if(this.options.background && this.options.background!='none') {
        this.controls.background = this.container.append("path")
            .attr("class", "background")
            .attr("fill", this.options.background.fill)
            .attr("d", lane.arc(range[0], range[1]));
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
                .attr("d", function(b,i) { return lane.arc(_this.scale(b.range[0]), _this.scale(b.range[1])); });
    }

    // draw caption
    if(this.caption) {
        var xofs = lane.offset + lane.width/2, yofs = 0;
        var rofs = -90;
        console.log(this.caption);
        this.controls.caption = this.container.append("text")
            .attr("class", "caption "+this.name+"-caption")
            .attr("text-anchor", "middle")
            .attr("x", xofs)
            .attr("y", yofs)
            .attr("dy", 40)
            .attr("font-family", this.options.text.font)
            .attr("font-size", this.options.text.size)
            .attr("fill", this.options.text.color)
            .attr("transform", function(d,i) { return "rotate(" + (rofs + _this.scale(0.5) * 180 / Math.PI) + ")"; })
            .text(this.caption);
    }

    // current target
    if(this.options.type==null || this.options.type=='tick') {
        this.controls.indicator = this.container.append("path")
            .attr("class", "incline-indicator")
            .attr("d", this.lane.tick(0, target.width))
            .attr("transform", "rotate(" + this.scale.degrees(target.value) + ")");
    } else if (this.options.type=='progress') {
        this.controls.indicator = this.container.append("path")
            .attr("class","goal")   // TODO: this should be generic
            .attr("stroke", this.options.color.stroke)
            .attr("fill", this.options.color.fill)
            .attr("d", lane.arc(this.scale.range()[0], this.scale(0.25)));
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
        indicator
            .transition().duration(1000)
            .attr("transform", "rotate(" + this.scale.degrees(value) + ")");
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