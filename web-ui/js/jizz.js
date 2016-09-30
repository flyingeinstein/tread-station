/**
 * Created by colinmackenzie on 9/30/16.
 */


function Jizz(options, svg_group, svg)
{
    /*var svg;
    if(svg_group && svg_group._groups && svg_group._groups.length>0 && svg_group._groups[0].length>0) {
        //this.svg = svg = svg_group._groups[0][0].ownerSVGElement;
        //console.log(svg, svg_group._groups[0][0]);
        console.log(svg_group.select("")
    }*/
    this.svg = svg;


    // control measurements
    this.options = {
        // width and height of outer control
        width: 80,
        height: 450,

        decimals: 2,

        // measurement range
        range: [0,1],

        // possible types: 1D, 2D (rectangular coordinates), radial (1D circle/arc), polar (2D polar coordinates)
        type: 'radial',

        // if set, then the drawing is done around the given focal point (radial vizualization)
        //focal: [x, y],

        stroke: {
            color: "cyan",
            width: 2
            // opacity = 1.0
        },
        border: 6,
        blur: 4,
        //gooey: 5,
        expiration: 3000,
        limit: 75
    };
    $.extend(this.options, options);

    this.controls = {};
    this.groups = {};

    // build the scale of units between sonar range and visual pixels
    this.unitScale = d3.scaleLinear()
        .domain(this.options.range)
        .range([0,this.options.height - this.options.width ]);


    // build our historical data visualization SVG filter
    var filter=null;
    var filterid = "gooey"+this.instanceNumber;
    var defs = svg.append('defs');

    // setup the history blur
    if(this.options.blur || this.options.gooey) {
        var gStdDev = this.options.blur ? this.options.blur : this.options.gooey;
        filter = defs.append("filter").attr("id", filterid);
        filter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", gStdDev)
            .attr('result', 'blur');
        if (this.options.gooey) {
            filter.append('feColorMatrix')
                .attr('in', 'blur')
                .attr('mode', 'matrix')
                .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -3')
                .attr('result', 'gooey');
            /*            filter.append('feComposite')
             .attr('in', 'SourceGraphic')
             .attr('in2', 'gooey')
             .attr('operator', 'atop');*/
        }
    }

    // create historical
    this.history = [];
    var container = this.container = svg_group.append("g")
        .attr("class", "history");
    if(filter)
        this.container.style("filter", "url(#"+filterid+")"); //Set the filter on the container svg


    // historical lines
    this.controls.history = this.container
        .selectAll("g.historical-line")
        .data(this.history, function(d) { return d.time; });

    // TODO: Add the out-of-range indicator?
/*    // out of range indicator
    var metrics = this.getMetrics();
    var radius = 4;
    this.controls.outOfRangeIndicator = this.controls.outline
        .append("circle")
        .attr("fill", "yellow")
        .attr("r", radius)
        .attr("cx", metrics.outline.cx )
        .attr("cy", metrics.outline.bottom - radius - 6)
        .style("opacity", 0.0);*/

    // update the view
    this.updateHistory();

}

Jizz.prototype.xy = function(domain_value) {
    // TODO: handle radial viz
    return [this.options.width/2, this.unitScale(domain_value)];
};

Jizz.prototype.updateHistory = function()
{
    var _this = this;
    var now = Number(new Date());
    var line_width = 5;

    // update history
    //this.history = this.history.filter(function(e) { return (now - e.time)<slider.options.expiration; });
    var dots = this.container
        .selectAll(".historical-line")
        .data(this.history, function(d) { return d.time; });
    dots
        .enter()
        .append("line")
        .attr("class", "historical-line")
        .attr("id", function(d) { return "hl-"+d.time; })
        .attr("stroke", this.options.stroke.color)
        .attr("stroke-width", this.options.stroke.width)
        .style("stroke-opacity", this.options.stroke.opacity ? this.options.stroke.opacity : 1.0 )
        // TODO: Anyway to reduce the redundant xy() function calls here?
        .attr("x1", function(d) { return _this.xy(d.value)[0]-line_width; })
        .attr("x2", function(d) { return _this.xy(d.value)[0]+line_width; })
        .attr("y1", function(d) { return _this.xy(d.value)[1]; })
        .attr("y2", function(d) { return _this.xy(d.value)[1]; })
        .transition().duration(3000)
        .style("stroke-opacity", 0.0);
    dots
        .exit()
        .remove();
};

Jizz.prototype.add = function(value, timestamp)
{
    if(timestamp==null)
        timesetamp = Number(new Date());

    // add to history
    this.history.push({ time:timestamp, value: value });
};