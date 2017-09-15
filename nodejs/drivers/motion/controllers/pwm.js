'use strict';

class PWMController {
    constructor(props) {
        this.name = "simulation";
        this.name = "Simulated Treadmill Control";
        this.devicePath = "experience";
        this.description = "A simulated treadmill motion controller for testing";
        this.simulation = true;
        this.devices = [this];
        this.driver = {};
        this.depends = ["motion/controllers"];
    }

    probe() {

        return true;
    }

    open() {

        // Instantiate bbbPWM object to control PWM device.  Pass in device path
        // and the period to the constructor.
        this.pwm = new bbbPWM(this.pwm_endpoint, 50000000);
        this.pwm.turnOff();
        this.pwm.polarity(0);
 
        return true;
    }

    close() {
        return true;
    }

    enable() {
        this.pwm.turnOn();
        this.active = true;
    }

    disable() {
        this.pwm.turnOff();
        this.active = false;
    }

    speed(val) {
        this.speed = Number(val);
        this.pwm.setDuty(this.speed*100);
    }

};

module.exports = PWMController;

