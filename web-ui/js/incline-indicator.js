/**
 * Created by colinmackenzie on 9/28/16.
 */


function InclineIndicator(options)
{
    DialIndicator.call(this);
    if(options)
        $.extend(this.options, options);
}
InclineIndicator.prototype = new DialIndicator();
