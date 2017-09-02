'use strict';
const Session = require("./session");

/*
 * This controller provides high level behavioral control over the treadmill controller. It keeps the controller drivers
 * simple by implementing the running logic here. The interface to this controller should be similar to the human interface
 * you would experience on a real treadmill.
 *
 */

//const Simulation = require('./controllers/simulation.js');
//const Nordic = require('./controllers/nordic.js');


class TreadmillControl {
    constructor(props) {
        this.name = "Treadmill Control";
        this.devicePath = "treadmill";
        this.description = "Provides user experience for treadmill control";
        this.devices = [this];
        this.driver = {};
        this.depends = ["motion/controllers"];

        this.currentSpeed = 0;
        this.desiredSpeed = 0;
        this.speedMeasured = 0;
        this.accelleration = 1;

        this.currentIncline = 0;
        this.desiredIncline = 0;

        // limits - in native format
        this.speedIncrement = this.MPHtoNative(0.1);
        this.minSpeed = 90; // this is a built in limit of the speed controller
        this.maxSpeed = this.MPHtoNative(8.0);

        this.inclineIncrement = this.inclineGradeToNative(1);
        this.minIncline = this.inclineGradeToNative(0);
        this.maxIncline = this.inclineGradeToNative(50);

        this.session = new Session(user);
    }

    probe(props) {
        if(this.refs.controllers && this.refs.controllers.devices && this.refs.controllers.devices.length>0) {
            let devs = this.refs.controllers.devices;
            let sim = null;
            this.motion = null;
            for(let i=0, _i=devs.length; i<_i; i++) {
                if(!devs[i].simulation) {
                    this.motion = devs[i];
                    break;
                } else
                    sim = devs[i];
            }
            if(this.motion===null)
                this.motion = sim;
            console.log("selected "+this.motion.name+" motion controller");
        }

        return this.motion ? true : false;
    }

    enable() {
        // startup a thread to send status every 1 second
        if(this.__updateInterval)
            clearInterval(this.__updateInterval);
        this.__updateInterval = setInterval(function() { this.__updateStatus() }.bind(this), 1000);
        /// to clear:    clearInterval(_treadmill.__updateInterval);
    }

    disable() {
        if(this.__updateInterval) {
            clearInterval(this.__updateInterval);
            this.__updateInterval = null;
        }
    }

    setUser(user, weight)
    {
        if(!user)
            return;
        else if(user.userid===null)
        {
            if(isNaN(user))
            {
                for(var u in this.users)
                {
                    if(this.users[u].name === user) {
                        user = this.users[u];
                        break;
                    }
                }
            } else
                user = this.users[ Number(user) ];
        }
        console.log("selecting user "+user.name);
        this.reset();

        this.session = new Session(user);
        if(user.goaltime!=null)
            this.goaltime=user.goaltime;
        if(user.goaldistance!=null)
            this.goaldistance=user.goaldistance;

        // notify the interface
        if(this.connection)
            this.connection.sendUTF(JSON.stringify({ type:'response', schema:'user', response: (this.session!=null) ? this.session.user : null }));
        if(weight!=null) {
            this.updateWeight(weight);
        }
    };

    __speed(value) {
        this.motion.speed(value);
        console.log("pwm => "+value);
    }

    __activate() {
        this.motion.turnOn();
        this.__sendEvent("running");
    }

    __deactivate() {
        this.motion.turnOff();
        this.__sendEvent("stopping");
    }

    speed(value) {
        if(!this.motion) return false;

        var was_active = this.active;

        // TODO: The accelleration verbs
        if(value==="STOP") {
            return this.stop();
        } else if(value==="PANIC" || value==="ESTOP") {
            return this.fullstop();
        } else if(value==="START") {
            return this.speed("2.0");
        } else if(value==="++") {
            this.active = true;
            this.desiredSpeed += this.speedIncrement;
        } else if(value==="--") {
            this.active = true;
            this.desiredSpeed -= this.speedIncrement;
        } else if(!isNaN(value)) {
            // startup if stopped
            this.active = true;
            console.log("speed <= "+value);
            this.desiredSpeed = clamp( this.MPHtoNative(Number(value)), this.minSpeed, this.maxSpeed);
        }

        // check limits
        if(this.desiredSpeed>this.maxSpeed)
            this.desiredSpeed=this.maxSpeed;
        else if(this.desiredSpeed<this.minSpeed && this.desiredSpeed>0)
            this.desiredSpeed=this.minSpeed;

        // start to accellerate or deccellerate
        if(this.currentSpeed < this.desiredSpeed)
            this.accellerate();
        else if(this.currentSpeed > this.desiredSpeed)
            this.deccellerate();

        // update the PWM
        this.__speed(this.currentSpeed);
        if(!was_active && this.active) {
            this.__activate();
        }

        this.motion.speed(value);
        if(!this.motion.active)
            this.motion.enable();
            
    }

    incline(value)
    {
        if(value==="++") {
            this.desiredIncline += this.inclineIncrement;
        } else if(value==="--") {
            this.desiredIncline -= this.inclineIncrement;
        } else if(value==="FLOOR") {
            this.desiredIncline = this.minIncline;
        } else if(!isNaN(value)) {
            value = clamp(Number(value), this.minIncline, this.maxIncline);
        }

        // TODO: do something here to make the incline change
    }

    accellerate()
    {
        if(this.currentSpeed !== this.desiredSpeed) {
            this.currentSpeed += this.accelleration;
            if(this.currentSpeed < this.minSpeed)
                this.currentSpeed = this.minSpeed;

            if(this.currentSpeed > this.maxSpeed)
                this.currentSpeed = this.maxSpeed;
            else if(this.currentSpeed > this.desiredSpeed)
                this.currentSpeed = this.desiredSpeed;
            else {
                setTimeout(function() { this.accellerate(); }.bind(this), 100);
            }
            this.__speed(this.currentSpeed);
        }
        this.__sendStatus();
    }

    deccellerate()
    {
        if(this.currentSpeed !== this.desiredSpeed) {
            this.currentSpeed -= this.accelleration;
            if (this.currentSpeed < this.minSpeed) {
                // we've stopped
                this.fullstop();
            } else if (this.currentSpeed < this.desiredSpeed) {
                this.currentSpeed = this.desiredSpeed;
            } else {
                setTimeout(function() { this.deccellerate(); }.bind(this), 100);
            }
            this.__speed(this.currentSpeed); // new
        }
        this.__sendStatus();
    }

    stop(value) {
        if(!this.motion) return false;
        this.motion.stop(value)
    }

    stop()
    {
        // todo: somehow the autpace UI driver needs to get an event from here
        //if(this.autopace.active)
        //    this.activateAutopace(false);

        if(this.desiredSpeed!=0) {
            this.desiredSpeed=0;
            this.__sendEvent("stopping");
            if(this.currentSpeed==0) {
                this.__sendEvent("stopped");
                this.updateStatus();
            }
        }
    }

    fullstop()
    {
        // todo: somehow the autpace UI driver needs to get an event from here
        //if(this.autopace.active)
        //    this.activateAutopace(false);

        this.active = false;
        if(!this.simulation.active) {
            controller.stop();
            this.pwm.turnOff();
        } else
            console.log("pwm => estop");
        this.desiredSpeed=0;
        this.currentSpeed=0;
        this.__sendEvent("stopped");
        this.updateStatus();
    }

    reset()
    {
        this.stop();
        this.runningSince=null;
        this.runningTime = 0;
        this.session.id = null;    // session begins when user starts treadmill again
        this.__sendStatus();
    }

    __sendEvent(name, data) {
        if(this.onEvent) {
            this.onevent(name, data);
        }
    }

    __updateStatus() {
        var now = new Date();

        // if we are starting or stopping, then start our running timer
        if(!this.active && this.runningSince!=null) {
            // we are stopping, add latest runtime to accumulated total
            this.runningTime += new Date().valueOf() - this.runningSince.valueOf();
            this.runningSince = null;
        } else if(this.active && this.runningSince==null) {
            // we are starting up, could be a new session or a continuation of an existing session
            if(this.session.id==null) {
                // new session
                this.runningSince = new Date();
                this.session.id = this.runningSince.unix_timestamp();
            } else {
                this.runningSince = new Date();
            }
        }

        // HACK: make the incline move for now
        if(this.desiredIncline != this.currentIncline) {
            if(this.currentIncline < this.desiredIncline)
                this.currentIncline += this.inclineIncrement;
            else
                this.currentIncline -= this.inclineIncrement;
        }

        this.__sendStatus();
    };


    __sendStatus() {
        if(this.onUpdate) {
            let status = {
                type: 'status',
                timestamp: new Date(),
                active: this.active,
                runningTime: this.getTotalRunningMillis(),
                currentSpeed: this.nativeToMPH(this.currentSpeed),
                desiredSpeed: this.nativeToMPH(this.desiredSpeed),
                currentIncline: this.nativeToInclineGrade(this.currentIncline),
                desiredIncline: this.nativeToInclineGrade(this.desiredIncline)
            };
            this.onUpdate(status);
        }
    }

    getTotalRunningMillis()
    {
        return (this.runningSince!==null)
            ? this.runningTime + (new Date().valueOf() - this.runningSince.valueOf())
            : this.runningTime;
    }

    MPHtoNative(value)
    {
        // 90 is 2mph, 150 is 3.4mph, 250 is 6mph
        return Number(value) * 45;
    }

    nativeToMPH(value)
    {
        return Number(value) / 45;
    };

    inclineGradeToNative(value)
    {
        return Number(value);
    };

    nativeToInclineGrade(value)
    {
        return Number(value);
    };

};

module.exports = TreadmillControl;
