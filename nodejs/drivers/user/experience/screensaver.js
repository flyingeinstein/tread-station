'use strict';

class ScreenSaverExperience {
    constructor(props) {
        this.name = "Screensaver";
        this.devicePath = "screensaver";
        this.description = "Controls the behavior of the screensaver";
        this.devices = [];
        this.driver = {};
        this.depends = ["output/screensaver"];
    }

    probe(props) {
        if(this.refs && this.refs.screensaver && this.refs.screensaver.devices.length>0) {
            this.backlight = this.refs.screensaver.devices[0];
            this.backlight.enable();
        } else
            console.log("no screensaver or backlight control drivers found");
        return true;
    }

    enable() {
        // every 10 seconds reset the screensaver so it doesnt activate
        this.enabled = true;
        this.resetTimer = setTimeout(function(){ this.reset(); }.bind(this), 10000);
    }

    disable() {
        this.enabled = false;
        clearTimeout(this.resetTimer);
    }
}

module.exports = ScreenSaverExperience;
