'use strict';

const mysql      = require('mysql');
const mysqlDateFormat = "yyyy-MM-dd HH:mm:ss";

Date.prototype.mysql = function()
{
    return this.toString(mysqlDateFormat);
}

Date.prototype.unix_timestamp = function()
{
    return Math.floor(this.getTime()/1000);
};

class DataModel
{
    constructor(config) {
        this.config = config;
        // connect to mysql
        if(config!==null && !config.testing) {
            // connect to mysql and load initial data
            this.db = mysql.createConnection({
                    host     : 'localhost',
                    user     : 'tread',
                    password : 'peps1c0la',
                    database : 'treadstation'
                });

            this.db.connect();
        }
    }


    updateWeight(user, weight) {
        if(weight && this.db!==null && this.session && this.session.user && this.session.user.userid>0) {
            var _treadmill = this;
            this.db.query("insert into weight(userid, ts, weight) values (?,unix_timestamp(),?);", [this.session.user.userid, weight])
                .on('end', function() {
                    // if log succeeds, then update user account
                    console.log("recorded weight "+weight);
                    _treadmill.db.query("update users set weight=? where userid=?;",
                        [weight, _treadmill.session.user.userid]);
                    _treadmill.session.user.weight = weight;
                    console.log(_treadmill.users[ _treadmill.session.user.userid ].weight);
                    _treadmill.connection.sendUTF(JSON.stringify({ type:'response', schema:'user', response: _treadmill.session.user }));
                });
        }
    }

    updateMysqlStatus()
    {
        try {
            if(this.storage.mysql && this.db && this.session && this.session.id && this.session.user && this.runningSince) {
                var _lastUpdate = new Date().unix_timestamp();
                var _runningSince = this.runningSince.unix_timestamp();
                var _runningTime = (new Date().valueOf() - this.runningSince.valueOf())/1000;
                console.log(this.session.user);
                this.db.query("insert into runs(session,user,ts,track,laps,lastupdate,runningTime,distance) values (?,?,?,?,?,?,?,?) on duplicate key update lastupdate=?, runningTime=?, laps=?, distance=?;", [
                    this.session.id, this.session.user.userid, _runningSince, this.track.id, this.track.laps, _lastUpdate, _runningTime, this.distance, // insert values
                    _lastUpdate, _runningTime, this.track.laps, this.distance])    // update values
                    .on('error', function(err) {
                        this.session.recording = false;
                        console.log(err);
                    }.bind(this))
                    .on('end', function() {
                        this.session.recording=true;
                    }.bind(this));
            } else {
                this.session.recording = false;
            }
        } catch(ex) {
            console.log("warning: failed to send to mysql : "+ex);
            this.abortConnection();
        }
    };
}

module.exports = DataModel;