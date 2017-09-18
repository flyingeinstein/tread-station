'use strict';

class MysqlDriver  {
    constructor(props) {
        this.name = "mysql";
        this.name = "Mysql Database Driver";
        this.devicePath = "database";
        this.description = "Attempts to connect to a treadmill database using mysql";
        this.simulation = true;
        this.devices = [];
        this.driver = {};

        this.config = {
            host     : 'localhost',
            user     : 'tread',
            password : 'peps1c0la',
            database : 'treadstation'
        };
    }

    probe() {

        this.db = mysql.createConnection(this.config);

        this.db.connect();

    }
}

module.exports = MysqlDriver;