/**
 * Created by colin on 10/8/2016.
 */


function ButtonIndicator(options)
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
    DialIndicator.prototype.attach.call(this, lane);
    this.container.attr("style","cursor:hand");
};








function ButtonGroupIndicator(options)
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


    // this band scale computes the radial range of each button in the group
    var band = d3.scaleBand()
        .domain(this.options.buttons)
        .range(this.scale.range())
        .paddingInner(0.05);
    var bandwidth = band.bandwidth();

    // create each button
    $.each(this.options.buttons, function(k, b) {
        var name = (b && b.name) ? b.name : "button"+k;

        // merge the options for the button
        var options = $.extend(true, {
            lane: _this.options.lane,
            arcrange: [ band(b), band(b)+bandwidth ]
        }, _this.options.button_options);

        // the user can specify buttons as a simple label list, object list or actual button references
        var button;
        if(typeof b ==="string") {
            button = new ButtonIndicator(options);
            button.name = name;
            button.caption = b;
        } else if (typeof b ==="object") {
            // button was an object of options, combine with other options
            options = $.extend(true, {}, options, b);
            button = new ButtonIndicator(options);
            if(b.id) name = b.id;
            button.caption = b.caption;
        }

        lane.dial.plugin(name, button);
    });
};

