

function DriverTree(props)
{
    this.drivers = [];
    this.tree = {};
}

DriverTree.prototype.enumerate = function()
{
    this.drivers.push({
        path: 'pwm/bbb.pwmtest',
        klass: require('./pwm/bbb.pwmtest')
    });
};

DriverTree.prototype.probe = function(props)
{
    for(var i=0, n=this.drivers.length; i<n; i++) {
        var driverinfo = this.drivers[i];
        var driver = new driverinfo.klass();
        driver.info = driverinfo;
        if(driver.probe(props)) {
            driver.tree = this;
            this.drivers.push(driver);

            if(!this.tree[driver.devicePath])
                dnode = this.tree[driver.devicePath] = {
                    path: '/'+driver.devicePath,
                    driver: driver,
                    devices: []
                };
            else
                dnode = this.tree[driver.devicePath];

            if(driver.devices && driver.devices.length>0) {
                // update path for all devices
                for (var j = 0, _j = driver.devices.length; j < _j; j++) {
                    var dev = driver.devices[j];
                    dev.path = dnode.path+'/'+driver.name+':'+j;
                }

                dnode[driver.name] = driver.devices;
                dnode.devices = dnode.devices.concat(driver.devices);
            }
            console.log(dnode);
        }
    }
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

module.exports = DriverTree;
