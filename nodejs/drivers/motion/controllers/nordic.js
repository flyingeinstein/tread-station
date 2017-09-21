'use strict';
const PWMControlDriver = require('./pwm.js');
const scale = require('d3-scale');

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
					scale: scale.scaleLinear().domain([0,9]).range([0, 100]),
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

