const postal = require('postal');
var Aggregate = require('../../../aggregate');

class Session {
    constructor(user, props) {
        // session
        this.id = new Date().unix_timestamp();
        this.user = user;
        this.recording = false;
        this.active = false;
        if(props && props.database)
            this.db = props.database;

        // current speed setting
        this.segment = null;

        // track history
        this.segments= [];

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
                    if (this.segment===null && newspeed > 0) {
                        // first segment in the session
                        this.start(data.value);
                    } else if (newspeed === 0) {
                        // we've stopped, so we can close off this segment
                        this.stop();
                    } else {
                        // speed change within a segment
                        let diff = now - this.segment.since;
                        let oldspeed = this.segment.speed;

                        // detect if the user is changing speeds quickly
                        if (diff < 1000) {
                            // short distance, just merge
                            this.segment.speed = data.value;
                        } else {
                            console.log("speed change " + diff + "ms x" + oldspeed + " => " + data.value);
                            // add the segment of speed to history
                            this.segments.push(this.segment);
                            this.segment = new Session.Segment(data.value);
                        }

                    }
                }
            }),

            stop: postal.subscribe({
                channel: "controlpanel", topic: "event.stop",
                callback: (data, envelope) => {
                    this.stop();
                }
            }),

            db: postal.subscribe({
                channel: "database",
                topic: "device.ready",
                callback: (data) => { this.db = data.device.db; console.log("session got db"); }
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

    start(speed)
    {
        if(this.segment ===null) {
            this.segment = new Session.Segment(speed ? speed : 0);
        }
    }

    stop()
    {
        if(this.segment !== null) {
            this.segment.end = new Date();
            this.segments.push(this.segment);
            this.segment = null;
            console.log("there are "+this.segments.length+" speed segments");
        }
    }

    total()
    {
        // add up the history
        let since=null, segcount=this.segments.length, distance = 0, millis = 0, speed_acc = 0;
        for(let i=0; i<segcount;i++) {
            let seg = this.segments[i];
            let duration = seg.duration();
            millis += duration;
            distance += seg.speed * duration / 3600000; // MPH * duration_ms / (millis-in-an-hour)
            speed_acc += duration * seg.speed;
            if(since===null)
                since = seg.since;
        }
        if(this.segment!==null) {
            // add in the current segment portion
            let duration = this.segment.duration();
            millis += duration;
            distance += this.segment.speed * duration / 3600000;
            speed_acc += duration * this.segment.speed;
            segcount++;
            if(since===null)
                since = this.segment.since;
        }
        return {
            since: since,
            duration: millis,
            distance: distance,
            avgspeed: (millis>0) ? speed_acc / millis : 0,
            segments: segcount
        };
    }


    __update() {
        let status = {
            type: 'status',
//            headline: this.headline,
            timestamp: new Date(),
            active: this.active,
            runningSince: this.runningSince,
            runningTime: this.getTotalRunningMillis(),
            distance: this.getTotalRunningDistance(),
            currentSpeed: this.nativeToMPH(this.segment.speed),
            desiredSpeed: this.nativeToMPH(this.desiredSpeed),
            currentIncline: this.nativeToInclineGrade(this.currentIncline),
            desiredIncline: this.nativeToInclineGrade(this.desiredIncline)
        };
        this.bus.publish("state", status);
    }

    updateMysqlStatus()
    {
        try {
            let total = this.total();
            if(this.db && this.user && total.since!==null) {
                let _lastUpdate = new Date().unix_timestamp();
                //console.log("session.update  ", this.id, "   user: ", this.user.userid, "   totals: ", total);
                this.db.query("insert into runs(session,user,ts,track,laps,lastupdate,runningTime,distance) values (?,?,?,?,?,?,?,?) on duplicate key update lastupdate=?, runningTime=?, laps=?, distance=?;", [
                        this.id, this.user.userid, total.since.unix_timestamp(), this.track.id, this.track.laps, _lastUpdate, total.duration, total.distance, // insert values
                        _lastUpdate, total.duration, this.track.laps, total.distance])    // update values
                    .on('error', function(err) {
                        this.recording = false;
                        console.log(err);
                        console.log("recording of runs disabled");
                    }.bind(this))
                    .on('end', function() {
                        this.recording=true;
                    }.bind(this));
            }
        } catch(ex) {
            console.log("warning: failed to send to mysql : "+ex);
            this.recording = false;
        }
    };
}

class Segment {
    constructor(speed) {
        this.since = new Date();
        this.end = null;        // no end time yet
        this.speed = speed ? speed : 0;
    }
    
    /// Return duration of segment in milliseconds
    duration() {
        let now =  (this.end!==null)
            ? this.end
            : new Date().valueOf();
        return (this.since!==null)
            ? now - this.since.valueOf()
            : 0;
    }
    
    /// Return distance in miles
    distance() {
        return this.speed * this.duration() / 3600000;
    }
}

Session.Segment = Segment;

module.exports = Session;