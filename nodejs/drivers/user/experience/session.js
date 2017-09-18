const postal = require('postal');
var Aggregate = require('../../../aggregate');

class Session {
    constructor(user) {
        // session
        this.id = null;
        this.user = user;
        this.recording = false;
        this.active = false;

        // variables
        this.runningTime = 0;       // total running millis (accumulates start/stops until a reset)
        this.runningSince = null;   // Date that we started running (non stop)
        this.segments = 0;
        this.distance = 0;

        // current speed setting
        this.segment = null;
        this.currentSpeed = 0;
        this.currentSpeedSince = null;

        // track history
        this.history = {
            speed: []
        }

        // goals
        this.track = {
            id: 0,
            laps: 0
        };
        this.goals = {
            time : 90*60,       // default to 90 minutes
            distance : null
        };

        // metrics
        this.metrics = {
            mets : new Aggregate(0),
            speed : new Aggregate(0),
            incline : new Aggregate(0)
        };
    }

    activate() {
        // catch speed changes so we can capture average speed and distance
        this.subs = {
            speed: postal.subscribe({
                channel: "controlpanel", topic: "event.speed",
                callback: (data, envelope) => {
                    let now = new Date();
                    let newspeed = data.value;
                    if (this.runningSince === null && newspeed > 0) {
                        this.start();
                    } else if (newspeed === 0) {
                        this.stop();
                    }

                    if (this.currentSpeedSince !== null) {
                        let diff = now - this.currentSpeedSince;
                        let oldspeed = this.currentSpeed;
                        this.currentSpeedSince = now;
                        this.currentSpeed = data.value;

                        if (diff < 1000) {
                            // short distance, just merge
                            this.currentSpeed = data.value;
                        } else {
                            console.log("speed change " + diff + "ms x" + oldspeed + " => " + data.value);
                            // add the segment of speed to history
                            this.history.speed.push(this.segment);
                            this.segment = {
                                since: now,
                                speed: oldspeed,
                                duration: diff
                            }
                        }
                    } else {
                        // first setting
                        this.currentSpeedSince = now;
                        this.currentSpeed = data.value;
                    }
                }
            }),

            stop: postal.subscribe({
                channel: "controlpanel", topic: "event.stop",
                callback: (data, envelope) => {
                    this.stop();
                }
            })
        };
        this.active = true;
    }

    deactivate() {
        this.subs.speed.unsubscribe();
        this.subs.stop.unsubscribe();
        this.subs = {};
        this.active = false;
    }

    start()
    {
        if(this.runningSince ===null) {
            this.runningSince = new Date();
            this.segment = {
                since: this.runningSince,
                speed: 0,
                duration: 0
            };
        }
    }

    stop()
    {
        if(this.runningSince !== null) {
            this.runningTime += new Date().valueOf() - this.runningSince.valueOf();
            this.runningSince = null;
            if(this.segment!==null) {
                this.history.speed.push(this.segment);
                this.segment = null;
            }
            console.log("there are "+this.history.speed.length+" speed segments");
        }
    }

    getTotalRunningMillis()
    {
        return (this.runningSince!==null)
            ? this.runningTime + (new Date().valueOf() - this.runningSince.valueOf())
            : this.runningTime;
    }

    __update() {
        let status = {
            type: 'status',
//            headline: this.headline,
            timestamp: new Date(),
            active: this.active,
            runningSince: this.runningSince,
            runningTime: this.getTotalRunningMillis(),
            distance: this.distance,
            currentSpeed: this.nativeToMPH(this.currentSpeed),
            desiredSpeed: this.nativeToMPH(this.desiredSpeed),
            currentIncline: this.nativeToInclineGrade(this.currentIncline),
            desiredIncline: this.nativeToInclineGrade(this.desiredIncline)
        };
        this.bus.publish("state", status);
    }

}

module.exports = Session;