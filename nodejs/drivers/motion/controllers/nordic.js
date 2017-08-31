'use strict';
const PWMController = require('./pwm.js');

class NordicController extends PWMController {
	constructor(props) {
		super(props);
        this.name = "NordicTrak (PWM)";
        this.description = "NordicTrak motion control board";
        this.depends = [ "output/pwm" ];

	}

	probe(props) {
		//console.log("probing nordic", this.tree.output.pwm.devices);
		if(this.refs.pwm) {
			var pwm = this.refs.pwm;
			if(pwm.devices.length>0) {
				this.pwm = pwm.devices[0];
                this.devices = [ this ];
                console.log("controller: "+this.name+" is using pwm channel 0 ("+this.pwm.driver.name+")");
				return true;
			}
		}
		console.log("no controller found, switching to simulation");
		return false;
	}


};

module.exports = NordicController;

