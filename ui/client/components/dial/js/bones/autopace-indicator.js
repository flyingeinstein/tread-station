/**
 * Created by colin on 9/29/2016.
 */
import $ from "jquery";
import {DialIndicator} from './dial-indicator.js';
import {Jizz} from './jizz.js';


export function AutoPaceIndicator(options)
{
    var slider = this;
    DialIndicator.call(this);

    // control measurements
    var default_options = {
        // width and height of outer control
        width: 80,
        height: 450,

        decimals: 2,

        lane: {
            ordinal: 1,
            alignment: 'left'
        },

        sonar: {
            range: [0,1]
        },

        targets: {
            set: {
                color: "cyan"
            },
            current: {
                color: "gray"
            }
        },
        jizz: {
            background: false
            /*stroke: {
                color: "yellow"
            }*/
        }
    };
    this.options = $.extend(true, this.options, default_options, options);

    /*// merge any user supplied options if found
    var user_options_object = this.container.data("options");
    if(user_options_object) {
        this.user_options = window[user_options_object];
        if(this.user_options) {
            this.options = $.extend(true, {}, this.options, this.user_options);
        }
    }*/

    // TODO: Refactor this into the options collection instead
    this.bands = [
        {
            name: 'low',
            color: 'red',
            opacity: 0.3,
            range: [0,0.2]
        },
        {
            name: 'good',
            color: 'green',
            opacity: 0.3,
            range: [0.2,0.35]
        },
        {
            name: 'balanced',
            color: 'green',
            opacity: 0.5,
            range: [0.35,0.6]
        },
        {
            name: 'good',
            color: 'green',
            opacity: 0.3,
            range: [0.6,0.75]
        },
        {
            name: 'high',
            color: 'cyan',
            opacity: 0.3,
            range: [0.75,1.0]
        }
    ];

}
AutoPaceIndicator.prototype = new DialIndicator();


AutoPaceIndicator.prototype.attach = function(lane)
{
    DialIndicator.prototype.attach.call(this, lane);
    this.options.jizz.lane = lane;
    this.jizz = new Jizz(this.options.jizz, this.container, this.svg);
    this.jizz.options.type = 'radial';
    this.jizz.options.focal = {
        x: this.lane.dial.center.x,
        y: this.lane.dial.center.y,
        radius: this.lane.offset + this.lane.width / 2
    };
    //this.jizz.unitScale.range( this.scale.range() );
    this.jizz.unitScale = this.scale;
};

AutoPaceIndicator.prototype.mouse = function(node)
{
    return d3.mouse(node ? node.node() : this.svg.node());
};