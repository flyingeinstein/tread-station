/**
 * Created by colinmackenzie on 9/28/16.
 */


function InclineIndicator(options)
{
    DialIndicator.call(this);
    if(options)
        this.options = $.extend(true, this.options, options);
    console.log(this.options);
}
InclineIndicator.prototype = new DialIndicator();
