'use strict';

const fs = require('fs');
const path = require('path');
const Q = require('q');
const glob = require("glob");

function PwmChannel(driver, pwmPath, channel, period) {
    this.period = period ? period : 0;
    this.driver = driver;
    this.chip = path.basename(pwmPath);
    this.channel = channel;
    this.id = this.chip+":"+this.channel;
    this.debug = false;
    this.path = pwmPath;
    this.endpoint = {
        enable: pwmPath + '/enable',
        duty: pwmPath + '/duty_cycle',
        period: pwmPath + '/period',
        polarity: pwmPath + '/polarity'
    }
    if(this.period>0)
        this.setPeriod(this.period);
}


PwmChannel.prototype.writeFile = function (file, content) {
    let deferred = Q.defer();
    try {
        fs.writeFile(file, content+'\n', function (error) {
            if (error) {
                deferred.reject(error);
            }
            else {
                if(this.debug)
                    console.log('writeFile complete: ' + file);
                deferred.resolve();
            }
        }.bind(this));
    } catch(ex) {
        console.log("pwm: write failed for channel "+this.id+": ", ex);
        deferred.reject(ex);
    }
    return deferred.promise;
};

PwmChannel.prototype.turnOff = function () {
    if(this.debug)  console.log(this.id+": disabled");
    this.writeFile(this.endpoint.enable, '0');
    this.active = false;
};

PwmChannel.prototype.turnOn = function () {
    if(this.debug)  console.log(this.id+": enabled");
    this.writeFile(this.endpoint.enable, '1');
    this.active = true;
};

PwmChannel.prototype.enable = function (e) {
    return (arguments.length==0 || e) ? this.turnOn() : this.turnOff();
}

PwmChannel.prototype.disable = function () {
    return thus.turnOff();
}

PwmChannel.prototype.setDuty = function (duty) {
    try {
        this.duty = Math.floor(Number(duty));
        if(this.debug)  console.log(this.id+": duty set to "+this.duty);
        this.writeFile(this.endpoint.duty, this.duty);
    }
    catch (e) {
        console.log('setDuty error: ' + e);
    }
    return this.duty;
};

PwmChannel.prototype.setPeriod = function (v) {
    if(arguments.length>0) {
        this.period = 0+v;
        if(this.debug)  console.log(this.id+": period set to "+this.period);
        this.writeFile(this.endpoint.period, String(v));
    }
    return this.period;
};

PwmChannel.prototype.setInversed = function (v) {
    if(arguments.length>0)
        return this.setPolarity(v ? "inversed" : "normal");
    else
        return this.polarity==="inversed";
}

PwmChannel.prototype.setPolarity = function (v) {
    if(typeof v ==="string") {
        switch(v) {
            case "normal": this.writeFile(this.endpoint.polarity, this.polarity = "normal"); break;
            case "inverted":
            case "inversed": this.writeFile(this.endpoint.polarity, this.polarity = "inversed"); break;
        }
    }
};

PwmChannel.prototype.open = function () {
return true;
    // usually root owns the pwm device, we want to take ownership
    // current user must be in the /etc/sudoers file with NOPASSWD needed
    //this.driver.tree.takeOwnershipOfDevice(this.path);

    this.writeFile(this.endpoint.enable, '1').then(function () {
        return this.writeFile(this.endpoint.period, this.endpoint.period);
    }.bind(this)).then(function () {
            console.log('PWM Configured...');
        }.bind(this), this.errorHandler).done();
};

PwmChannel.prototype.close = function () {
};

PwmChannel.errorHandler = function (error) {
    console.log('Error: ' + error.message);
};

function PWM() {
    this.name= "EHR PWM via SysFS";
    this.devicePath="pwm";
    this.description="PWM driver using standard /sys/class/pwm interface";
    this.devices = [];
}

PWM.prototype.createChannel = function(channel_number, pwm_endpoint) {
    console.log("        creating channel "+pwm_endpoint);
    let channel = new PWM.Channel(this, pwm_endpoint, channel_number);
    this.devices.push( channel );
}

PWM.prototype.probeChip = function (pwmchip_endpoint) {
    console.log("   probing chip "+pwmchip_endpoint);
    //try {
        // how many channels does this chip support
        let channels = Number( fs.readFileSync(pwmchip_endpoint+"/npwm") );
        for(let i=0; i<channels; i++) {
            let pwm_endpoint = pwmchip_endpoint+"/pwm"+i;
            if(fs.existsSync(pwm_endpoint)) {
                this.createChannel(i, pwm_endpoint);
            } else {
                // channel has not been exported, should we?
                // ...
            }
        }
    //} catch(ex) {
    //    console.log("warning: could not probe pwm "+pwmchip_endpoint+", aborting. "+ex);
    //}
}

PWM.prototype.probe = function (v) {
    console.log("probing /sys/class/pwm for channels");
    glob.sync("/sys/class/pwm/pwmchip*")
        .forEach(chip => this.probeChip(chip));
   return this.devices.length>0;
};

// PWM Channel is the driver instance class for BBB PWM Legacy
PWM.Channel = PwmChannel;

// export the main driver class
module.exports = PWM;
