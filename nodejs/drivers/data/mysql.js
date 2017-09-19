'use strict';
const Q = require('q');
const mysql      = require('mysql');
const mysqlDateFormat = "yyyy-MM-dd HH:mm:ss";

class MysqlDriver  {
    constructor(props) {
        this.name = "mysql";
        this.name = "Mysql Database Driver";
        this.devicePath = "database";
        this.description = "Attempts to connect to a treadmill database using mysql";
        this.simulation = true;
        this.devices = [];
        this.driver = {};
        this.depends = ["system/configuration"];
    }

    probe(props) {
        // find our configuration
        if(!props.db) {
            this.config = props.db = props.readSection("db", {
                host     : 'localhost',
                user     : 'tread',
                password : 'peps1c0la',
                database : 'treadstation'
            });
        } else
            this.config = props.db;

        let defer = Q.defer();
        this.db = mysql.createConnection(this.config);
        this.db.connect((err) => {
            if(err) {
                if(err.code==='ECONNREFUSED') {
                    console.log("no mysql to connect to, history may be disabled if no storage option exists");
                    // no mysql detected, so just return as success but driver will be disabled
                    defer.resolve(false);
                } else {
                    console.log("mysql connect error ", err);
                    defer.reject(false);
                }
            } else {
                console.log("connected to mysql server "+this.config.host+"   (database: "+this.config.database+")");
                this.devices.push(this);
                defer.resolve(true);
            }
        });
        return defer.promise;
    }
}

module.exports = MysqlDriver;