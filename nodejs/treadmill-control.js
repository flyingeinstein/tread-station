'use strict';

/*
 * This controller provides high level behavioral control over the treadmill controller. It keeps the controller drivers
 * simple by implementing the running logic here. The interface to this controller should be similar to the human interface
 * you would experience on a real treadmill.
 *
 */

const Simulation = require('./controllers/simulation.js');
const Nordic = require('./controllers/nordic.js');


class TreadmillControl {
    constructor(props) {
        if(props.simulation)
            this.driver = new Simulation();
        else
            this.driver = new Nordic();

        if(this.driver && this.driver.name!==null)
            console.log("selected "+this.driver.name+" controller");
    }

    speed(value) {
        if(!this.driver) return false;
        this.driver.speed(value);
        if(!this.driver.active)
            this.driver.enable();
            
    }

    
    stop(value) {
        if(!this.driver) return false;
        this.driver.stop(value)
    }



};

module.exports = TreadmillControl;
