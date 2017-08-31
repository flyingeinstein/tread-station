'use strict';

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
        this.devicePath = "experience";
        this.description = "Provides user experience for treadmill control";
        this.devices = [this];
        this.driver = {};
        this.depends = ["motion/controllers"];
    }

    probe(props) {
        if(this.refs.controllers && this.refs.controllers.devices && this.refs.controllers.devices.length>0) {
            let devs = this.refs.controllers.devices;
            for(let i=0, _i=devs.length; i<_i; i++) {
                if(!devs[i].simulation) {
                    this.motion = devs[i];
                    break;
                }
            }
            console.log("selected "+this.motion.name+" motion controller");
        }

        return false;
    }

    speed(value) {
        if(!this.motion) return false;
        this.motion.speed(value);
        if(!this.motion.active)
            this.motion.enable();
            
    }

    
    stop(value) {
        if(!this.motion) return false;
        this.motion.stop(value)
    }

};

module.exports = TreadmillControl;
