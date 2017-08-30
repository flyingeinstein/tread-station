'use strict';
var bbbPWM = require('./bbb-pwm');
var fs = require('fs');
var glob = require("glob");

class PWMController {
    constructor(props) {
        this.name = "PWM Controller";
    }

    probe() {
        // find the OCP PWM module as it's very nomadic
        var ocp_root = null, pwm_endpoint = null;
        var files = glob.sync("/sys/devices/platform/ocp");
        if(files.length>1) {
	        console.log("found too many potential OCP folders:");
	        files.forEach(function(item) { console.log("  : "+item); });
        } else if(files.length==1) {
	        ocp_root = files[0];
	        console.log("found OCP root at "+ocp_root);

	        // found OCP root, now find the PWM module
	        files = glob.sync(ocp_root+"/ocp:pwm_test_P8_13");
	        if(files.length>1) {
		        console.log("found too many potential PWM endpoints for P8:13:");
		        files.forEach(function(item) { console.log("  : "+item); });
        	} else if(files.length==1) {
        		pwm_endpoint = files[0]+'/';
        		console.log("found PWM P8:13 endpoint at "+pwm_endpoint);
        	}
        } else {
        	// look in pwm location in >4.1 kernels
        	files = glob.sync("/sys/class/pwm/pwmchip0/pwm1");
        	if(files.length==1) {
        		pwm_endpoint = files[0]+'/';
        		console.log("found PWM P8:13 endpoint at "+pwm_endpoint);
        	}
        }

        if(!pwm_endpoint) {
            console.log("failed to find the PWM P8:13 endpoint in /sys/devices/ocp.?/pwm_test_P8_13.??");
            return false;
        }

        return true;
    }

    open() {
    // usually root owns the pwm device, we want to take ownership
        // current user must be in the /etc/sudoers file with NOPASSWD needed
        this.takeOwnershipOfDevice(pwm_endpoint);

        // Instantiate bbbPWM object to control PWM device.  Pass in device path
        // and the period to the constructor.
        this.pwm = new bbbPWM(pwm_endpoint, 50000000);
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

