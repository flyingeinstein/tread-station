'use strict';
const PWMControlDriver = require('./pwm.js');

class NordicControlDriver extends PWMControlDriver {
	constructor(props) {
		super(props);
        this.name = "NordicTrak (PWM)";
        this.description = "NordicTrak motion control board";
	}

	probe(props) {
		//console.log("probing nordic", this.tree.output.pwm.devices);
		if(this.refs.pwm) {
			var pwm = this.refs.pwm;
			if(pwm.devices.length>0) {
				let pwmchannel = pwm.devices[0];
				let controller = new NordicControlDriver.Controller(this, pwmchannel, {
					smooth: true,
					period: 50000000
				});
				controller.open();
                this.devices.push( controller );
                console.log("controller: "+this.name+" is using pwm channel 0 ("+pwmchannel.driver.name+")");
				return true;
			}
		}
        console.log("no treadmill motion controllers configured");
		return false;
	}
}

NordicControlDriver.Controller = PWMControlDriver.Controller;

module.exports = NordicControlDriver;

