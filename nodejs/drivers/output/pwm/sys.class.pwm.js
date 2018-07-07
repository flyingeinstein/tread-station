'use strict';

const fs = require('fs');
const path = require('path');
const Q = require('q');
const glob = require("glob");
const pwmmap = require('./pwm.map');

class PwmChannel {
    constructor(driver, hardware, pwmPath, channel, period) {
        this.period = period ? period : 0;
        this.driver = driver;
        this.chip = path.basename(pwmPath);
        this.channel = channel;
        this.id = this.chip + ":" + this.channel;
        this.debug = false;
        this.path = pwmPath;
		this.hardware = hardware;
        this.queryPinMux();
        this.endpoint = {
            enable: pwmPath + '/enable',
            duty: pwmPath + '/duty_cycle',
            period: pwmPath + '/period',
            polarity: pwmPath + '/polarity'
        }
        if (this.period > 0)
            this.setPeriod(this.period);
    }


    writeFile(file, content) {
        let deferred = Q.defer();
        try {
            fs.writeFile(file, content + '\n', function (error) {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    if (this.debug)
                        console.log('writeFile complete: ' + file);
                    deferred.resolve();
                }
            }.bind(this));
        } catch (ex) {
            console.log("pwm: write failed for channel " + this.id + ": ", ex);
            deferred.reject(ex);
        }
        return deferred.promise;
    }

    readFile(file) {
        let deferred = Q.defer();
        try {
            fs.readFile(file, 'utf8', function (error, data) {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    if (this.debug)
                        console.log('readFile complete: ' + file, "data:", data);
                    deferred.resolve(data.replace(/\n$/,""));
                }
            }.bind(this));
        } catch (ex) {
            console.log("pwm: write failed for channel " + this.id + ": ", ex);
            deferred.reject(ex);
        }
        return deferred.promise;
    }

	setPinMux(v) {
        if (this.debug) console.log("setting pinumx on channel "+this.id + " to "+v);
        this.writeFile("/sys/devices/platform/ocp/ocp:"+this.hardware.pin+"_pinmux/state", v)
                .then(() => { 
                    this.queryPinMux().then((mux) => {
                        if(mux !=v)
                            console.log("unable to modify the mux for "+this.id+" for pin "+this.hardware.pin);
                    });
                });
	}

	queryPinMux() {
        let deferred = Q.defer();
        this.readFile("/sys/devices/platform/ocp/ocp:"+this.hardware.pin+"_pinmux/state")
            .then((data) => { 
                this.hardware.mux = data; 
                console.log("pinmux for "+this.id+" is currently set to "+data);
                deferred.resolve(this.hardware.mux);
            }, (reason) => { 
                console.log("failed to read pinumx: ",reason); 
                deferred.reject(reason);
            });
        return deferred;
	}

    turnOff() {
        if (this.debug) console.log(this.id + ": disabled");
        this.writeFile(this.endpoint.enable, '0');
        this.active = false;
    }

    turnOn() {
        if (this.debug) console.log(this.id + ": enabled");
        this.writeFile(this.endpoint.enable, '1');
        this.active = true;
    };

    enable(e) {
        if(this.hardware.mux != "pwm")
            this.setPinMux("pwm");
        return (arguments.length == 0 || e) ? this.turnOn() : this.turnOff();
    }

    disable() {
        return thus.turnOff();
    }

    setDuty(duty) {
        try {
            this.duty = Math.floor(Number(duty));
            if (this.debug) console.log(this.id + ": duty set to " + this.duty);
            this.writeFile(this.endpoint.duty, this.duty);
        }
        catch (e) {
            console.log('setDuty error: ' + e);
        }
        return this.duty;
    };

    setPeriod(v) {
        if (arguments.length > 0) {
            this.period = 0 + v;
            if (this.debug) console.log(this.id + ": period set to " + this.period);
            this.writeFile(this.endpoint.period, String(v));
        }
        return this.period;
    };

    setInversed(v) {
        if (arguments.length > 0)
            return this.setPolarity(v ? "inversed" : "normal");
        else
            return this.polarity === "inversed";
    }

    setPolarity(v) {
        if (typeof v === "string") {
            switch (v) {
                case "normal":
                    this.writeFile(this.endpoint.polarity, this.polarity = "normal");
                    break;
                case "inverted":
                case "inversed":
                    this.writeFile(this.endpoint.polarity, this.polarity = "inversed");
                    break;
            }
        }
    }

    open() {
        // usually root owns the pwm device, we want to take ownership
        // current user must be in the /etc/sudoers file with NOPASSWD needed
        //this.driver.tree.takeOwnershipOfDevice(this.path);
        return true;
    }

    close() {
    }

    errorHandler (error) {
        console.log('Error: ' + error.message);
    }
}


class PWMDriver
{
    constructor()
    {
        this.name = "EHR PWM via SysFS";
        this.devicePath = "pwm";
        this.description = "PWM driver using standard /sys/class/pwm interface";
        this.devices = [];
    }


    createChannel(channel_number, pwm_endpoint, hardware) {
        console.log("        creating channel " + pwm_endpoint);
        let channel = new PwmChannel(this, hardware, pwm_endpoint, channel_number);
        this.devices.push(channel);
    }

    probeChip(pwmchip_endpoint) {
        // get the chip hardware
        let hardware = {
            id: null,
            address: null
        }
        try {
            hardware.id = parseInt(pwmchip_endpoint.match(/\d+$/)[0], 10);
        } catch(ex) {
            console.log("warning: unable to determine ID of "+pwmchip_endpoint);
        }

        try {
            let match = fs.readlinkSync(pwmchip_endpoint + "/device").match(/(\d+)\.(pwm|ecap)/);
            if(match.length) {
                hardware.address = match[1];
                hardware.kind = match[2];
                hardware.device = pwmmap.address[hardware.address];
            }
        } catch(ex) {
            console.log("warning: unable to determine hardware address of "+pwmchip_endpoint);
        }

        console.log("   probing chip " + pwmchip_endpoint, "  id:"+hardware.id, "  addr:"+hardware.address, "   kind:"+hardware.kind);
        try {
            // how many channels does this chip support
            let channels = Number(fs.readFileSync(pwmchip_endpoint + "/npwm"));
            for (let i = 0; i < channels; i++) {
                let pwm_endpoint = pwmchip_endpoint + "/pwm" + i;
                if (fs.existsSync(pwm_endpoint)) {
                    console.log("creating channel "+pwm_endpoint);
                } else if(fs.existsSync(pwmchip_endpoint +"/pwm-"+hardware.id+":"+i)) {
                    pwm_endpoint = pwmchip_endpoint +"/pwm-"+hardware.id+":"+i;
                } else {
                    // channel has not been exported, should we?
                    // ...
                    continue;
                }

                let chhw = {
                    name: hardware.device && hardware.device.name ? hardware.device.name+":"+i : null,
                    device: hardware,
                    pin: (hardware.device && hardware.device.channels) ? hardware.device.channels[i].pin : null
                };

                this.createChannel(i, pwm_endpoint, chhw);
            }
        } catch(ex) {
            console.log("warning: could not probe pwm "+pwmchip_endpoint+", aborting. ", ex);
        }
    }

    probe(v) {
        console.log("probing /sys/class/pwm for channels");
        glob.sync("/sys/class/pwm/pwmchip*")
            .forEach(chip => this.probeChip(chip)
        );
        return this.devices.length > 0;
    };

}

// PWM Channel is the driver instance class for BBB PWM Legacy
PWMDriver.Channel = PwmChannel;

// export the main driver class
module.exports = PWMDriver;
