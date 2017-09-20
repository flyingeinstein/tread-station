'use strict';

class Users {
    constructor(props) {
        this.name = "users";
        this.name = "Users Data Model";
        this.devicePath = "users";
        this.description = "Manages users within a ";
        this.simulation = true;
        this.devices = [];
        this.driver = {};
    }

    probe() {
        this.userchannel = this.postal.channel("user");

        this.postal.subscribe({
            channel: "database",
            topic: "device.ready",
            callback: (data) => { this.db = data.device.db; this.loadUsers(); this.loadDefaultUser(); }
        });

        // set first user as default when users are loaded
        this.bus.subscribe("refreshed", (data) => { if(data.length>0) this.setUser(data[0]) });

        this.devices.push(this);
        return true;
    }

    loadUsers() {
        if(this.db) {
            console.log("loading users from database ");
            try {
                this.db.query('SELECT * FROM users', function (error, results, fields) {
                        this.users = results;
                        console.log("loaded "+this.users.length+" users from mysql");
                        //console.log(this.users);

                        // notify that list of users changed
                        this.bus.publish("refreshed", this.users);
                    }.bind(this));
            } catch(e) {
                console.log(e);
            }
        } else {
            console.log("using dummy users table for testing");
            // setup some dummy data for testing
            this.users = [
                {
                    userid: 1,
                    name: 'Colin MacKenzie',
                    birthdate: new Date('1975-06-25'),
                    weight: 68,
                    height: 170,
                    goaltime: 5400,
                    goaldistance: null
                },
                {
                    userid: 2,
                    name: 'Kinga Ganko',
                    birthdate: new Date('1975-11-01'),
                    weight: 53,
                    height: 169,
                    goaltime: 5400,
                    goaldistance: null
                }
            ];
        }
    }

    setUser(user)
    {
        if(user===undefined || user===null)
            return false;
        if(isNaN(user))
        {
            for(let u in this.users)
            {
                if(this.users[u].name === user) {
                    user = users[u];
                    break;
                }
            }
        } else
            user = this.users[ Number(user) ];

        if(typeof user ==="object") {
            this.user = user;
            console.log("selected user " + this.user.userid + " - " + this.user.name);
            this.userchannel.publish("selected", this.user);
            return this.user;
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
}

module.exports = Users;