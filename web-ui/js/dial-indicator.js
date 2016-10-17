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
        tick: {
            fill: 'white',
            width: 0.015
        },

        transition: true,

        caption: "",
        text: {
            font: 'arial',
            size: '100px',
            color: 'white'
        }
    };
    if(options)
        this.options = $.extend(true, this.options, options);

    this.value = 0;
}

DialIndicator.prototype.attach = function(lane)
{
    //console.log("attached to ", lane);
    //var radius = this.lane.dial.radii.outer + 20;
    var range = this.scale.range();
    var _this = this;

    if(this.options.transition==true)
        this.options.transition = 1000;
    if(this.value==null)
        this.value = 0;

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
            .attr("d", lane.arc(range[0], range[1], this.options.background.margin));
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
        if(this.caption.length>1 && this.caption[0]=='$') {
            var yofs = lane.offset + lane.width / 2, xofs = 0;
            var rofs = -180;
            // glyph
            var glyphname = this.caption.substr(1);
            var glyphcode = lane.dial.glyphs[glyphname];
            if(glyphcode)
                return this.container.append("path")
                    .attr("class","glyph")
                    .attr("d",glyphcode)
                    .attr("stroke-width","4")
                    .attr("stroke", "whitesmoke")
                    .attr("fill", "transparent")
                    //.attr("x", xofs)
                    //.attr("y", yofs)
                    .attr("transform", function (d, i) {
                        return "translate("+xofs+","+yofs+") rotate(" + (rofs + _this.scale(0.5) * 180 / Math.PI) + ","+(-xofs)+","+(-yofs)+") scale("+4+")";
                    });
//                this.controls.caption = glyph(glyphcode, this.container, lane.offset+lane.width/2, Math.PI+(Math.PI-speedRange[1])/2, 4.0, center);

        } else {
            var xofs = lane.offset + lane.width / 2, yofs = 0;
            var rofs = -90;
            this.controls.caption = this.container.append("text")
                .attr("class", "caption " + this.name + "-caption")
                .attr("text-anchor", "middle")
                .attr("x", xofs)
                .attr("y", yofs)
                .attr("dy", 40)
                .attr("font-family", this.options.text.font)
                .attr("font-size", this.options.text.size)
                .attr("fill", this.options.text.color)
                .attr("transform", function (d, i) {
                    return "rotate(" + (rofs + _this.scale(0.5) * 180 / Math.PI) + ")";
                })
                .text(this.caption);
        }
    }

    // current target
    if(this.options.type==null || this.options.type=='tick') {
        this.controls.indicator = this.container.append("path")
            .attr("class", "incline-indicator")
            .attr("d", this.lane.tick(0, this.options.tick.width))
            .attr("transform", "rotate(" + this.scale.degrees(this.value) + ")");
    } else if (this.options.type=='progress') {
        this.controls.indicator = this.container.append("path")
            .attr("class","goal")   // TODO: this should be generic
            .attr("stroke", this.options.tick.stroke)
            .attr("fill", this.options.tick.fill)
            .attr("d", lane.arc(this.scale.range()[0], this.scale(this.value)));
    }
};

DialIndicator.prototype.set = function(value)
{
    var _this = this;
    var oldValue;
    var v;

    oldValue = this.domainValue ? this.domainValue : this.value;


    // compute the value
    if(this.options.valueFunction) {
        v = this.options.valueFunction.apply(this, arguments);
        this.value = arguments;
        this.domainValue = v;
        //console.log("value func: ", arguments.length, arguments, " = ", v);
    } else
        v = this.value = value;

    // clamp value to domain range
    var domain = this.scale.domain();
    if(v < domain[0])
        v = domain[0];
    else if(v > domain[1])
        v = domain[1];

    var indicator =  (this.options.transition)
        ? this.controls.indicator.transition().duration(this.options.transition)
        : this.controls.indicator;

    // update current target
    if(this.options.type==null || this.options.type=='tick') {
        indicator
            .attr("transform", "rotate(" + this.scale.degrees(v) + ")");
    } else if (this.options.type=='progress') {
        if(this.options.transition) {
            // our local tween function
            var interpolator = d3.interpolate(this.scale(oldValue), this.scale(v));

            function arcTween() {
                return function (t) {
                    return _this.lane.arc(_this.scale.range()[0], interpolator(t));
                };
            }

            indicator.attrTween("d", arcTween);
        } else
            indicator.attr("d", this.lane.arc(_this.scale.range()[0], this.scale(v)));
    }
};