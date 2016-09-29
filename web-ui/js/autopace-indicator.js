/**
 * Created by colin on 9/29/2016.
 */

function AutoPaceIndicator(options)
{
    $.extend(this.lane, options);
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
