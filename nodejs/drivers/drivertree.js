const glob = require("glob");


function DriverTree(props)
{
    this.root = {
        input: {
            hid: new DriverTree.Node({ path: "input/controllers"}),
            sensors: new DriverTree.Node({ path: "input/sensors"})
        },
        output: {
            pwm: new DriverTree.Node({ path: "pwm"})
        },
        motion: {
            controllers: new DriverTree.Node({ path: "motion/controllers"})
        }
    };
}

DriverTree.prototype.enumerate = function()
{
    files = glob.sync("./drivers/*");
    files.forEach(function(item, x, y) { console.log("  : ", item, x, y); });

    return 0;

    this.root.output.pwm.addDriver({
        path: 'pwm/bbb.pwmtest',
        klass: require('./pwm/bbb.pwmtest')
    });
};

DriverTree.prototype.probe = function(props)
{
    this.root.output.pwm.probe(props);
    console.log(this.root.output.pwm);
};

// todo: this should probably be a function of the DeviceTree
DriverTree.prototype.takeOwnershipOfDevice = function(device_path)
{
    /*
        exec("sudo chown -R $USER "+device_path, function(error,stdout, stderr) {
            if(error) {
                ss.enabled = false;
                console.log("failed to take ownership of "+device_path+", error "+error);
                console.log(stdout);
                console.log("errors:");
                console.log(stderr);
            }
        });
    */
}

function DriverTreeNode(props)
{
    this.path = props.path;
    this.drivers = [];
    this.devices = [];
}

DriverTreeNode.prototype.addDriver = function(driverinfo) {
    if(driverinfo===null || driverinfo.klass===null || driverinfo.path===null) {
        console.log("invalid driver info: ", driverinfo);
    }

    // get an instance of the driver control class
    var driver = new driverinfo.klass();
    driver.info = driverinfo;

    this.drivers.push(driver);

    return driver;
}

DriverTreeNode.prototype.probe = function(props)
{
    var valid_drivers = [];
    for(var i=0, n=this.drivers.length; i<n; i++) {
        var driver = this.drivers[i];

        if(!driver.probe) {
            console.log("driver has no probe function: ", driver);
            continue;
        }

        // get the driver control class to probe for devices on the system
        if(driver.probe(props)) {
            //driver.node = this;
            valid_drivers.push(driver);

            if(driver.devices && driver.devices.length>0) {
                // update path for all devices
                for (var j = 0, _j = driver.devices.length; j < _j; j++) {
                    var dev = driver.devices[j];
                    dev.node = this;
                    this.devices.push(dev);
                }
            }
        }
    }

    // now replace the list of drivers with only the ones found
    this.drivers = valid_drivers;
};


DriverTree.Node = DriverTreeNode;

module.exports = DriverTree;
