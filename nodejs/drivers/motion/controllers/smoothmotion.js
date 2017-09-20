'use strict';

class SmoothMotionDriver {
    constructor(props) {
        this.name = "Smooth Motion";
        this.devicePath = "smoothmotion";
        this.description = "Controls output to make abrupt speed transitions smooth";
        this.simulation = false;
        this.devices = [];
        this.driver = {};
        //this.depends = [];
    }

    probe() {
        // smooth motion always available
        return true;
    }
}

class SmoothMotion {
    constructor(controller) {
        this.output = controller;
        this.actual = this.current = 0;

        // take on the properties of the target controller
        //this.name = (this.output.name===undefined) ? "SmoothMotion" : this.output.name;
        //this.description = (this.output.description===undefined) ? "Controls output to make abrupt speed transitions smooth" : this.output.description;
        //this.simulation = (this.output.simulation===undefined) ? false : this.output.simulation;
    }

    enable() {
        return (this.output)
            ? this.output.enable()
            : false;
    }

    disable() {
        return (this.output)
            ? this.output.disable()
            : false;
    }

    speed(val) {
        return (this.output)
            ? this.output.speed(val)
            : false;
    }

    stop() {
        return (this.output)
            ? this.output.stop()
            : false;
    }
}
SmoothMotionDriver.Controller = SmoothMotion;
module.exports = SmoothMotionDriver;
