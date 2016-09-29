/**
 * Created by colinmackenzie on 9/28/16.
 */


function InclineIndicator(options)
{
    $.extend(this.lane, options);
}
InclineIndicator.prototype = new DialIndicator();
