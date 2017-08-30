var fs = require('fs');
var Q = require('q');
var glob = require("glob");

function PwmChannel(pwmPath, period) {
    PwmChannel.PERIOD = period;

    this.sysClassMode = 0;//fs.lstatSync(pwmPath + 'enable').isFile();
    PwmChannel.RUN_PATH = pwmPath + (this.sysClassMode ? 'enable' : 'run');
    PwmChannel.DUTY_PATH = pwmPath + (this.sysClassMode ? 'duty_cycle' : 'duty');
    PwmChannel.PERIOD_PATH = pwmPath + 'period';
    PwmChannel.POLARITY_PATH = pwmPath + 'polarity';
}


PwmChannel.prototype.writeFile = function (file, content) {
    var deferred = Q.defer();
    fs.writeFile(file, content, function (error) {
        if (error) {
            deferred.reject(error);
        }
        else {
            console.log('writeFile complete: ' + file);
            deferred.resolve();
        }
    });
    return deferred.promise;
};

PwmChannel.prototype.setDuty = function (duty) {
    try {
        fs.writeFile(PwmChannel.DUTY_PATH, Math.floor(Number(duty) * 1000));
    }
    catch (e) {
        console.log('setDuty error: ' + e);
    }
};

PwmChannel.prototype.turnOff = function () {
    this.writeFile(PwmChannel.RUN_PATH, '0');
};

PwmChannel.prototype.turnOn = function () {
    this.writeFile(PwmChannel.RUN_PATH, '1');
};

PwmChannel.prototype.period = function (v) {
    this.writeFile(PwmChannel.PERIOD_PATH, String(v));
};

PwmChannel.prototype.polarity = function (v) {
    this.writeFile(PwmChannel.POLARITY_PATH, String(v));
};

PwmChannel.prototype.open = function () {
    var _this = this;

    // usually root owns the pwm device, we want to take ownership
    // current user must be in the /etc/sudoers file with NOPASSWD needed
    this.driver.tree.takeOwnershipOfDevice(pwmPath);

    this.writeFile(PwmChannel.RUN_PATH, '1').then(function () {
        return _this.writeFile(PwmChannel.PERIOD_PATH, PwmChannel.PERIOD);
    }).then(function () {
            console.log('PWM Configured...');
        }, _this.errorHandler).done();
};

PwmChannel.prototype.close = function () {
};

PwmChannel.errorHandler = function (error) {
    console.log('Error: ' + error.message);
};

function PWM() {
    this.name= "BBB.PWM.Legacy";
    this.devicePath="pwm";
    this.description="PWM driver using legacy PWMTest driver for BeagleBoneBlack";
    this.devices = [];
}

PWM.prototype.probe = function (v) {
    // find the OCP PWM module as it's very nomadic
    var pwm_endpoint=null;
    var ocp_root = null;
    var files = glob.sync("/sys/devices/platform/ocp");
    if(files.length>1) {
        console.log("found too many potential OCP folders:");
        files.forEach(function(item) { console.log("  : "+item); });
    } else if(files.length===1) {
        ocp_root = files[0];
        console.log("found OCP root at "+ocp_root);

        // found OCP root, now find the PWM module
        files = glob.sync(ocp_root+"/ocp:pwm_test_P8_13");
        if(files.length>1) {
            console.log("found too many potential PWM endpoints for P8:13:");
            files.forEach(function(item) { console.log("  : "+item); });
        } else if(files.length===1) {
            pwm_endpoint = files[0]+'/';
            console.log("found PWM P8:13 endpoint at "+pwm_endpoint);
        }
    } else {
        // look in pwm location in >4.1 kernels
        files = glob.sync("/sys/class/pwm/pwmchip0/pwm1");
        if(files.length===1) {
            pwm_endpoint = files[0]+'/';
            console.log("found PWM P8:13 endpoint at "+pwm_endpoint);
        }
    }
    pwm_endpoint = 'test';
    if(!pwm_endpoint) {
        console.log("failed to find the PWM P8:13 endpoint in /sys/devices/ocp.?/pwm_test_P8_13.??");
        return false;
    }

    var channel = new PwmChannel(pwm_endpoint, 50000000);
    channel.driver = this;
    this.devices.push( channel );
    return true;
};

// PWM Channel is the driver instance class for BBB PWM Legacy
PWM.PwmChannel = PwmChannel;

// export the main driver class
module.exports = PWM;
