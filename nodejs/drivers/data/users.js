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
        this.user = this.users[0];
        this.devices.push(this);
        console.log("loaded "+this.users.length+" users");
        return true;
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