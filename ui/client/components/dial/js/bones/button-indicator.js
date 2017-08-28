/**
 * Created by colin on 10/8/2016.
 */
import $ from "jquery";
import {scaleBand} from "d3-scale";
import {DialIndicator} from './dial-indicator.js';


export function ButtonIndicator(options)
{
    DialIndicator.call(this);
    var default_options = {
        type: 'button',
        value: 1  // the value of the button (optional)
    };

    if(options)
        $.extend(true, this.options, default_options, options);
}
ButtonIndicator.prototype = new DialIndicator();


ButtonIndicator.prototype.attach = function(lane)
{
    var _this = this;
    DialIndicator.prototype.attach.call(this, lane);
    this.container
        .attr("style","cursor:hand")
        .on("click", function() { if(_this.options.click) _this.options.click(_this); });
};








export function ButtonGroupIndicator(options)
{
    this.options = {
        lane: {
            ordinal: 1,
            alignment: 'right'
        },
        background: {
            fill: 'red'
        },
        color: {
            fill: 'white'
        },

        clickable: false,
        buttons: [],
        button_options: {
        }
    };
    if(options)
        this.options = $.extend(this.options, options);
}
ButtonGroupIndicator.prototype = new DialIndicator();


ButtonGroupIndicator.prototype.attach = function(lane)
{
    var _this = this;

    if(!this.options.lane) {
        console.log("Button group requires a 'lane' request option");
        return false;
    }
    if(this.options.buttons.length==0)
        return false;

    var items = [];
    $.each(this.options.buttons, function(k,b) {
        if(typeof b ==="string") {
            items.push(b);
        }
        else if(typeof b ==="object") {
           items.push(b.id);
        }
    });

    // this band scale computes the radial range of each button in the group
    var band = scaleBand()
        .domain(items)
        .range(this.scale.range())
        .paddingInner(0.05);
    var bandwidth = band.bandwidth();

    // create each button
    $.each(this.options.buttons, function(k, b) {
        var name = (b && b.name) ? b.name : "button"+k;
        var arcrange = null;

        // merge the options for the button
        var options = $.extend(true, _this.options.button_options, {
            lane: _this.options.lane,
            parent: _this.container,
            arcrange: [ band(b), band(b)+bandwidth ]
        });

        // the user can specify buttons as a simple label list, object list or actual button references
        var button;
        if(typeof b ==="string") {
            button = new ButtonIndicator(options);
            button.name = name;
            button.caption = b;
            arcrange = [ band(b), band(b)+bandwidth ];
        } else if (typeof b ==="object") {
            // button was an object of options, combine with other options
            options = $.extend(true, {}, options, b);
            button = new ButtonIndicator(options);
            if(b.id) name = b.id;
            button.caption = b.caption;
            arcrange = [ band(b.id), band(b.id)+bandwidth ]
        }

        button.options.arcrange = arcrange;
        lane.dial.plugin(name, button);
    });
};

