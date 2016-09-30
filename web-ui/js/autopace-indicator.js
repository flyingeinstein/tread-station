/**
 * Created by colin on 9/29/2016.
 */

function AutoPaceIndicator(options)
{
    var slider = this;

    // control measurements
    this.options = {
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
        outline: {
            border: 5, width: 24,
            color: "#444",
            fill: "none",
            opacity: 1.0
            // height: determined by formula
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
            width: 80,
            height: 450
        }
    };
    $.extend(this.options, options);
console.log(this.options);
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
            opacity: 0.5,
            range: [0,0.2]
        },
        {
            name: 'balanced',
            color: 'green',
            opacity: 0.3,
            range: [0.4,0.6]
        },
        {
            name: 'high',
            color: 'red',
            opacity: 0.5,
            range: [0.95,1.0]
        }
    ];

}
AutoPaceIndicator.prototype = new DialIndicator();


AutoPaceIndicator.prototype.attach = function(lane)
{
    DialIndicator.prototype.attach.call(this, lane);
    this.jizz = new Jizz(this.options.jizz, this.container, this.svg);
};