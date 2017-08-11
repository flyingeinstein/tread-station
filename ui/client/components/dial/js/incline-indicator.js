/**
 * Created by colinmackenzie on 9/28/16.
 */
import $ from "jquery";
import {DialIndicator} from './dial-indicator.js';


export function InclineIndicator(options)
{
    DialIndicator.call(this);
    if(options)
        this.options = $.extend(true, this.options, options);
}
InclineIndicator.prototype = new DialIndicator();
