'use strict';

const fs = require('fs');
const Q = require('q');

const searchpaths = ["/sys/class/backlight/backlight/brightness"];

class BacklightSysClass {
    constructor(props) {
        this.name = "Backlight Control";
        this.devicePath = "backlight";
        this.description = "Controls backlight display via /sys/class/backlight when the xset command (Xwindows) is not available";
        this.devices = [];
        this.driver = {};
        //this.depends = [];
    }

    probe(props) {
        searchpaths.forEach(function(p) {
            if(fs.existsSync(p)) {
                let stat = fs.lstatSync(p);
                if (stat.isFile()) {
                    console.log("found backlight control at "+p);
                    this.devices.push(new BacklightSysClass.Channel(this, p, props));
                }
            }
        }.bind(this));
        return this.devices.length>0;
    }
}


class BacklightChannel {
    constructor(driver, path, props)
    {
        this.value = 1;
        this.endpoint = path;
    }

    enable() {
        this.__set(this.value);
    }

    disable() {
        this.__set(0);
    }

    set(value) {
        this.__set(this.value = value);
    }

    __set(value) {
        let deferred = Q.defer();
        fs.writeFile(this.endpoint, value+'\n', function (error) {
            if (error) {
                deferred.reject(error);
            }
            else {
                deferred.resolve();
            }
        }.bind(this));
        return deferred.promise;
    }
}

BacklightSysClass.Channel = BacklightChannel;

module.exports = BacklightSysClass;
