'use strict';

const fs = require('fs');
const Q = require('q');

const searchpaths = ["/sys/bus/iio/devices/iio\:device0/in_distance_raw"];

class Lidar
{
    constructor(props) {
        this.name = "Lidar Range Sensor";
        this.devicePath = "range";
        this.description = "Lidar range finder from LidarLite";
        this.devices = [];
        this.driver = {};
        //this.depends = [];
    }

    probe(props) {
        searchpaths.forEach(function(p) {
            if(fs.existsSync(p)) {
                let stat = fs.lstatSync(p);
                if (stat.isFile()) {
                    console.log("found lidar at "+p);
                    this.devices.push(new Lidar.Channel(this, p, props));
                }
            }
        }.bind(this));
        return this.devices.length>0;
    }
}

class LidarChannel {
    constructor(driver, path, props) {
        this.driver = driver;
        this.path = path;
    }

    open() {
        // start a timer
    }

    close() {
        // stop the timer
    }

    read() {
        // read the value straight from the file
        fs.readFile(sensor_info.device.file, function(err, contents) {
            if(err==null) {
                this.value = parseInt(contents);
                console.log("lidar: "+this.value);
                this.sendUpdate(this.value);
            } else
                _treadmill.sendEvent("sonar.error", err.code);
            //else console.log("sonar read error: ", sensor_info.device.file, err);
        });
        return 0.0;
    }

    sendUpdate(value) {
        if(this.onRead)
            this.onRead(value, this.driver, this);
    }
}

Lidar.Channel = LidarChannel;
module.exports = Lidar;