'use strict';

const fs = require('fs');
const Q = require('q');
const exec = require('child_process').exec;

const searchpaths = ["/bin/xset"];

class XSetDriver {
    constructor(props) {
        this.name = "Backlight Control";
        this.devicePath = "xset";
        this.description = "Screensaver control via Xwindows xset command";
        this.devices = [];
        this.driver = {};
        //this.depends = [];
    }

    probe(props) {
        searchpaths.forEach(function(p) {
            if(fs.existsSync(p)) {
                let stat = fs.lstatSync(p);
                if (stat.isFile()) {
                    console.log("found xset control at "+p);
                    this.devices.push(new XSetDriver.Channel(this, p, props));
                }
            }
        }.bind(this));
        return this.devices.length>0;
    }
}


class XSetChannel {
    constructor(driver, path, props)
    {
        this.value = 1;
        this.setCommand = path;
        this.enabled = true;
        this.display = ":0.0";
        this.error = 0;

        // internal variables
        this.lastReset = new Date();
    }

    enable() {
        this.set("on");
    }

    disable() {
        this.set("off");
    }

    activate() {
        this.set("activate");
    }

    blank() {
        this.set("blank");
    }

    reset() {
        this.set("reset");
        this.lastReset=new Date();
    }

    setTimeout(secs) {
        this.set(""+secs);
    }

    set(action) {
        if(!this.enabled) return false;
        var ss = this;
        exec("DISPLAY="+this.display+" "+this.setCommand+" s "+action, function(error,stdout, stderr) {
            if(error) {
                if(ss.error++ >10) {
                    ss.enabled=false;
                }
                console.log("xset error "+error);
                console.log(stdout);
                console.log("errors:");
                console.log(stderr);
            }
        }.bind(this));
    }
}

XSetDriver.Channel = XSetChannel;

module.exports = XSetDriver;

/*
Treadmill.prototype.init_screensaver = function(action)
{
    this.screensaver = {
        // config/settings
        enabled: !simulate,
        display: ":0.0",
        error: 0,

        // internal variables
        lastReset: new Date(),

        // screensaver functions
        enable: function() { this.set("on"); },
        disable: function() { this.set("off"); },
        activate: function() { this.set("activate"); },
        blank: function() { this.set("blank"); },
        reset: function() { this.set("reset"); this.lastReset=new Date(); },
        timeout: function(secs) { this.set(""+secs); },

        // main set() function calls command "xset s <action>"
        set: function(action) {
            if(!this.enabled) return false;
            var ss = this;
            exec("DISPLAY="+this.display+" xset s "+action, function(error,stdout, stderr) {
                if(error) {
                    if(ss.error++ >10) {
                        ss.enabled=false;
                    }
                    console.log("xset error "+error);
                    console.log(stdout);
                    console.log("errors:");
                    console.log(stderr);
                }
            });
        }
    };

    if(simulate) return false;

    // initialize the screensaver
    var ss = this.screensaver;
    exec("./screensaver.conf "+this.screensaver.display, function(error,stdout, stderr) {
        if(error) {
            ss.enabled = false;
            console.log("screensaver.conf error "+error);
            console.log(stdout);
            console.log("errors:");
            console.log(stderr);
        }
    });

    this.screensaver.enable();
}
*/