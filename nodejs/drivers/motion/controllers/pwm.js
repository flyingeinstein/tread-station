'use strict';
const shifty = require("shifty");
const Smooth = require("../../motion/controllers/smoothmotion");
const Q = require('q');

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
        this.value = 0;

        if(this.options.smooth)
            this.enableSmoothMotion();
    }

    open() {
        this.pwm.open();
        if(this.options.scale)
            this.pwm.period(this.options.scale.range()[1]);
        this.pwm.turnOff();
        this.pwm.polarity(0);
        this.value = 0;

        // Instantiate bbbPWM object to control PWM device.  Pass in device path
        // and the period to the constructor.
        //this.pwm = new bbbPWM(this.pwm_endpoint, 50000000);
        return true;
    }

    close() {
        this.pwm.turnOff();
        this.value = 0;
        return true;
    }

    /* dont use enable/disable, not needed */
    enable() {
        this.pwm.turnOn();
        this.active = true;
    }

    disable() {
        this.pwm.turnOff();
        this.active = false;
        this.value = 0;
    }

    enableSmoothMotion() {
        /*this.smooth = new Smooth.Controller({
            speed: (val) => { console.log("speed => " + Number(val).toFixed(2)); },
            target: () => { return this.value; },
            stop: () => { console.log("stop"); }
        });*/
        this.tweener = new shifty.Tweenable();
    }

    // TODO: possibly we should be returning a promise here if actions do not immediately happen. I.e. when we issue a stop the controller
    // begins slowing down and then executes the promise when the machine is completely stopped.
    // NAW. Motion controllers should be very simple, and the smoother is itself a driver

    __speed(val, mode)
    {
        this.value = val;
        mode = mode ? "speed."+mode : "speed";
        console.log(mode+" => ", val.toFixed(2));
        this.pwm.setDuty(this.options.scale ? this.options.scale(val) : val);
        this.active = val>0;
        this.bus.publish(mode, {
            desiredSpeed: this.desired,
            currentSpeed: this.value
        });
    }

    // sets the speed in mph
    speed(val) {
        if (val === undefined || val === null || val==='++' || val==='--' || Number.isNaN(val)) {
            console.trace("invalid speed value given", typeof val, val);
            return false;
        } else {
            // set our new target
            let target = Number(val);
            this.desired = target;

            // get a new promise for when our speed finishes
            // cancel existing one if it exists
            if(this.defer && this.defer.promise.inspect().state ==="pending")
                this.defer.reject();
            this.defer = Q.defer();

            // unless we are already on the target we need to transition smoothly
            if(target !== this.value) {
                if(this.options.smooth && this.tweener) {

                    // stop any existing tween
                    if(this.tweener.isPlaying())
                        this.tweener.stop(false);

                    // start a tween
                    this.tweener.tween({
                        from: { value: this.value },
                        to: { value: target },
                        duration: 2000,
                        easing: 'easeOutQuad',
                        step: state => { this.__speed(state.value, "smooth"); }
                    })
                        .then( () => {
                            this.__speed(this.value);           // set speed one last time
                            this.defer.resolve(this.value);     // notify we've completed the speed command
                        })
                        .catch( () => null );
                } else {
                    this.__speed( this.target = target );
                    this.defer.resolve(this.value); // immediate resolve promise
                }
            } else {
                this.defer.resolve(this.value);
            }  // immediately resolve promise

            return this.defer.promise;
        }
    }

    stop()
    {
        this.speed(0).then((val) => {
            this.pwm.turnOff();
            this.pwm.setDuty(0);
            this.active = false;
            this.bus.publish("stopped");
            console.log("stopped at ", val);
        });
    }
}

PWMControlDriver.Controller = PWMController;
module.exports = PWMControlDriver;

