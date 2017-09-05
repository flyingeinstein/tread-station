const DataModel = require("../../../datamodel");
var Aggregate = require('../../../aggregate');

class Session {
    constructor(user) {
        // session
        this.id = null;
        this.user = user;
        this.recording = false;

        // variables
        this.runningTime = 0;       // total running millis (accumulates start/stops until a reset)
        this.runningSince = null;   // Date that we started running (non stop)
        this.distance = 0;

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

    getTotalRunningMillis()
    {
        return (this.runningSince!==null)
            ? this.runningTime + (new Date().valueOf() - this.runningSince.valueOf())
            : this.runningTime;
    }


}

module.exports = Session;