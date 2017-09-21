'use strict';


class Scale extends Function {
    constructor(_domain, _range) {
        function get(x) { return this.domain[0]; }
        get.data = {
            domain: _domain ? _domain : [0, 9],   // the speed range, typically in MPH
            range: _range ? _range : [0, 100]   // the output range (defaults to a percentage of duty)
        };
        get.__compute = function() {
            this.diviser = [
                this.data.domain[0]
            ];
        }.bind(get);
        return get;
    }
}

module.exports = Scale;
