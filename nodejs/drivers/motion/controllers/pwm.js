'use strict';
const Smooth = require("../../motion/controllers/smoothmotion");

class PWMControlDriver {
    constructor(props) {
        this.name = "PWM Treadmill Control";
        this.devicePath = "motion-control";
        this.description = "Motion controller that requires a PWM signal to control speed";
        this.devices = [];
        this.driver = {};
        this.depends = ["output/pwm"];
    }

    probe() {
        return false;
    }


}

class PWMController {
    constructor(driver, pwmchannel, options) {
        this.driver = driver;
        this.name = driver.name+" Controller";
        this.pwm = pwmchannel;
        this.options = options;

        if(this.options.smooth)
            this.enableSmoothMotion();
    }

    open() {
        this.pwm.open();
        this.pwm.period(this.options.period);
        this.pwm.turnOff();
        this.pwm.polarity(0);

        // Instantiate bbbPWM object to control PWM device.  Pass in device path
        // and the period to the constructor.
        //this.pwm = new bbbPWM(this.pwm_endpoint, 50000000);
        return true;
    }

    close() {
        this.pwm.turnOff();
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

    enableSmoothMotion() {
        /*this.smooth = new Smooth.Controller({
            speed: (val) => { console.log("speed => " + Number(val).toFixed(2)); },
            target: () => { return this.value; },
            stop: () => { console.log("stop"); }
        });*/
    }

    // TODO: possibly we should be returning a promise here if actions do not immediately happen. I.e. when we issue a stop the controller
    // begins slowing down and then executes the promise when the machine is completely stopped.
    // NAW. Motion controllers should be very simple, and the smoother is itself a driver

    speed(val) {
        if (val === undefined || val === null || val==='++' || val==='--' || Number.isNaN(val)) {
            console.trace("invalid speed value given", typeof val, val);
            return false;
        } else {
            this.value = Number(val);
            this.pwm.setDuty(this.value * 100);
            return true;
        }
    }

    stop()
    {
        this.pwm.turnOff();
        this.pwm.setDuty(0);
    }
}

PWMControlDriver.Controller = PWMController;
module.exports = PWMControlDriver;

