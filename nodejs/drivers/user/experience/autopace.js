

class AutoPace {
    constructor() {
        this.name = "AutoPace Control";
        this.devicePath = "autopace";
        this.description = "Provides user experience for treadmill control";
        this.devices = [];
        this.driver = {};
        this.depends = ["system/configuration", "sensors/range"];

        this.active = false;
        this.updatesPerSecond = 10;

        // initial parameters are recorded before activation
        // so we can restore these when we deactivate
        this.initial = {};

    }

    probe() {
        if(this.refs && this.refs.Configuration && this.refs.Configuration.autopace) {
            var config = this.refs.Configuration.autopace;
            console.log("found autopace configuration ", config);
            this.devices.push(new AutoPace.Channel(this, config));
        } else
            console.log("no autopace configuration, skipping.");
        return false;
    }
}

class AutoPaceChannel {
    constructor(driver, config)
    {
        this.driver = driver;
        this.config = config ? config : { simulate: false };

        // set a timer to read sensors
        this.__sensorInterval = setInterval(
            function () {
                this.readSensors();
            }.bind(this),   // update sensors then call the algorithm
            1000 / this.updatesPerSecond             // number of updates per second
        );

        if (this.config.simulate) {
            setTimeout(function () {
                console.log("simulating autopace");
                this.speed(4.2);
                this.activate(true);
            }.bind(this), 2000);
        }
    }

    speed(value) {
        // set the speed of the treadmill
        //todo: get a reference to the treadmill UX driver
    }

    activate() {
        if(!this.enabled)
            return false;
        if(this.active)
            return true;    // no change, redundant call
        if(!this.active || this.desiredSpeed===0) {
            console.log("cannot active autopace when the treadmill is not in motion");
            return false;   // cannot activate when the treadmill is inactive or stopped
        }

        // record our current settings so we can restore them later
        this.autopace.initial = {
            speed: this.nativeToMPH(this.desiredSpeed)
        };
        this.autopace.active = true;
        console.log("autopace activated");
    }

    deactivate() {
        if(!this.active)
            return true;    // already deactivated

        // restore our settings
        this.active = false;
        this.computeAutoPace();
        this.speed( this.autopace.initial.speed );
        console.log("autopace deactivated");
    }

    toggle() {

    }

    setCenter(value) {
        this.center = value;
    }

    // todo: maybe a kalman filter is in the future
    computeAutoPace() {
        if(this.enabled && this.active && this.mode) {
            if(!pace.active) {
                // deactivating, clear our settings
                pace.sonar = null;
                return true;
            }
            else if(!pace.sonar) {
                pace.sonar = {
                    // parameters
                    center: 100,
                    deadzone: 30,
                    limit: 175,
                    rollup: 10,

                    readings: [],

                    setCenter: function() {
                        var oldcenter = this.center;
                        this.center = _this.sensors.sonar.value;
                        console.log("autopace center set to "+this.center+" from "+oldcenter);
                    }
                };
            }

            if(!this.sensors || !this.sensors.sonar || this.sensors.sonar.value==null) {
                console.log(this.sensors);
                return false;
            }

            // update pace
            var sonar = this.sensors.sonar.value;
            if(pace.sonar.readings.length < pace.sonar.rollup) {
                // store the reading, dont update
                pace.sonar.readings.push(sonar);
                return false;
            } else {
                // average the readings
                sonar = 0;
                for(i=0; i<pace.sonar.readings.length; i++)
                    sonar += pace.sonar.readings[i];
                sonar = sonar/pace.sonar.readings.length;
                pace.sonar.readings = [];
            }

            // compute a new adjustment
            var current_speed = this.nativeToMPH(this.desiredSpeed);
            var speed = current_speed;

            if(sonar > pace.sonar.limit)
            //speed = pace.initial.speed;
                return false;
            else if(sonar < pace.sonar.center - pace.sonar.deadzone/2)
                speed -= 0.1;
            else if(sonar > pace.sonar.center + pace.sonar.deadzone/2)
                speed += 0.1;

            var adjustment = speed - current_speed;
            if(speed != current_speed)
                this.speed( speed );

            console.log("sonar:"+sonar.toFixed(1)+"   adj:"+adjustment.toFixed(1)+"  speed:"+speed.toFixed(1)+"/"+this.desiredSpeed.toFixed(1));
            return true;
        }
    }
}

AutoPace.Channel = AutoPaceChannel;
module.exports = AutoPace;