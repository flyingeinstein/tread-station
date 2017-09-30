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
			if(pwm.drivers.length>0) {
                let real_pwm = null;
                let sim_pwm = null;

                // try to find a non-simulation one
                for(let d=0; d<pwm.drivers.length; d++) {
                    let driver = pwm.drivers[d];
                    if(driver.devices.length>0) {
                        // found real PWM
                        if(driver.simulation)
                            sim_pwm = sim_pwm ? sim_pwm : driver.devices[0];
                        else
                            real_pwm = real_pwm ? real_pwm : driver.devices[0];
                    }
                }

				let pwmchannel = real_pwm ? real_pwm : sim_pwm;
				let controller = new NordicControlDriver.Controller(this, pwmchannel, {
					smooth: true,
					scale: scale.scaleLinear().domain([0,9]).range([0, 50000000]),
				});
				controller.open();
                this.devices.push( controller );
                console.log("controller: "+this.name+" is using pwm channel "+pwmchannel.id+" ("+pwmchannel.driver.name+")");
				return true;
			}
		}
        console.log("no treadmill motion controllers configured");
		return false;
	}
}

NordicControlDriver.Controller = PWMControlDriver.Controller;

module.exports = NordicControlDriver;

