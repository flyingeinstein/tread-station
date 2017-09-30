'use strict';

class PWMSimulation {
    constructor(props) {
        this.name = "Simulated PWM";
        this.devicePath = "pwm";
        this.description = "A simulated PWM channel for testing";
        this.simulation = true;
        this.devices = [];
        this.driver = {};
        //this.depends = [];
    }

    probe() {
        // simulation always available
        this.devices.push(new PWMSimulation.Channel(this, 0));
        this.devices.push(new PWMSimulation.Channel(this, 1));
        return true;
    }
}

class PWMSimulationChannel {
    constructor(driver, id){
        this.driver = driver;
        this.name = "pwm"+id;
        this.id = "sim:"+id;
        this.echo = false;
    }

    open() {
    }

    close() {
    }

    enable() {
		if(this.echo) console.log("motion enabled");
		return true;
	}

	disable() {
        if(this.echo) console.log("motion disabled");
		return true;
	}

	turnOn() {
	    this.active = true;
        if(this.echo) console.log(this.name+" output active");
    }

	turnOff() {
	    this.active = false;
        if(this.echo) console.log(this.name+" output deactivated");
    }

	setPolarity(v) {
	    this.polarity = v;
        if(this.echo) console.log(this.name+" polarity => "+this.polarity);
    }

	setPeriod(v) {
	    this.period = v;
        if(this.echo) console.log(this.name+" period => "+this.period);
    }

	setDuty(v) {
	    this.duty = v;
        if(this.echo) console.log(this.name+" duty => "+(this.duty / this.period));
    }
}

PWMSimulation.Channel = PWMSimulationChannel;
module.exports = PWMSimulation;

