/**
 * Created by colinmackenzie on 9/28/16.
 */


function InclineIndicator(options)
{
    if(options)
        $.extend(this.options, options);
}
InclineIndicator.prototype = new DialIndicator();
