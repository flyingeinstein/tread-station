const glob = require("glob");
const fs = require('fs');

function DriverTree(props)
{
    this.driverPath = "./drivers/";
    this.root = {
/*        input: {
            hid: new DriverTree.Node({ path: "input/controllers"}),
            sensors: new DriverTree.Node({ path: "input/sensors"})
        },
        output: {
            pwm: new DriverTree.Node({ path: "pwm"})
        },
        motion: {
            controllers: new DriverTree.Node({ path: "motion/controllers"})
        }*/
    };
}

DriverTree.prototype.__enumerate = function(node, path)
{
    fs.readdirSync(path ? this.driverPath+path : this.driverPath).forEach(file => {
        let filepath = path ? path+"/"+file : file;
        let stat = fs.lstatSync(this.driverPath+filepath);
        if(stat.isDirectory()) {
            this.__enumerate(
                node[file] = new DriverTree.Node({ tree: this, name: file, path: filepath }),
                filepath);
        } else if(node!==this.root && stat.isFile()) {
            if(file.match(/.js$/)) {
                node.addDriver({
                    path: path,
                    name: file,
                    klass: require("./"+filepath.replace(".js",""))
                });
            }
        }
    });
};

DriverTree.prototype.enumerate = function()
{
    let rv = this.__enumerate(this.root, null);
};

DriverTree.prototype.$ = function(node, name)
{
    let comps = name.split("/");
    while(comps.length>0) {
        let comp = comps.shift();
        if(node[comp]===undefined && node[comp]===null)
            return null;
        node = node[comp];
    }
    return node;
};

DriverTree.prototype.__resolveDependancies = function(node)
{
    if(node===null) node = this.root;
    if(node.drivers) {
        node.drivers.forEach(function(driver) {
            if(driver.depends !== undefined && driver.depends!==null) {
                //console.log("dependancy: ", driver.name, driver.depends);
                let depends = [];
                driver.depends.forEach(function(dep) {
                    let _dep = this.$(this.root, dep);
                    if(_dep) {
                        driver.refs[_dep.name] = _dep;
                        depends.push(_dep);
                    }
                }.bind(this));
                driver.depends = depends;
                //console.log("dependancy resolved: ", driver.name, driver.depends);
            }
        }.bind(this));
    }
    let children=Object.keys(node);
    children.forEach(function(c) {
        let child = node[c];
        if(child && child.tree && child.path && Array.isArray(child.drivers)) {
            this.__resolveDependancies(node[c]);
        }
    }.bind(this));
};

DriverTree.prototype.__probe = function(node, props)
{
    if(node===null) node = this.root;
    if(Array.isArray(node.drivers) && !node.probed) {
        node.probe(props);
    }
    let children=Object.keys(node);
    children.forEach(function(c) {
        let child = node[c];
        if(child && child.tree && child.path && Array.isArray(child.drivers)) {
            this.__probe(node[c]);
        }
    }.bind(this));
};

DriverTree.prototype.probe = function(props)
{
    this.__resolveDependancies(this.root);
    this.__probe(this.root);

    //this.root.output.pwm.probe(props);
    //this.root.motion.controllers.probe(props);
    //console.log(this.root);
    //console.log("controllers: "+this.root.motion.controllers.devices.length);
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
    this.tree = props.tree;
    this.name = props.name;
    this.path = props.path;
    this.drivers = [];
    this.devices = [];
}

DriverTreeNode.prototype.$ = function(name) {
    return (this.tree && this.tree.$) ? this.tree.$(this, name) : null;
};

DriverTreeNode.prototype.addDriver = function(driverinfo) {
    if(driverinfo===null || driverinfo.klass===null || driverinfo.path===null) {
        console.log("invalid driver info: ", driverinfo);
    }

    // get an instance of the driver control class
    let driver = new driverinfo.klass();
    driver.info = driverinfo;
    driver.refs = {};
    driver.probed = false;

    this.drivers.push(driver);

    return driver;
}

DriverTreeNode.prototype.probe = function(props)
{
    let valid_drivers = [];
    this.probed = true;
    for(let i=0, n=this.drivers.length; i<n; i++) {
        let driver = this.drivers[i];
        if(driver.probed)
            continue;

        if(driver.depends) {
            // ensure any dependencies are probe'd first
            driver.depends.forEach(function(d) {
                if(d.probed===false || !d.probe ) return;
                //console.log("probing dependancy: ", d.path);
                this.tree.__probe(d, props);
            }.bind(this));
        }

        if(!driver.probe) {
            console.log("driver has no probe function: ", driver);
            continue;
        }
        driver.tree = this.tree;
        driver.node = this;
        driver.probed = true;

        // get the driver control class to probe for devices on the system
        if(driver.probe(props)) {
            //driver.node = this;
            valid_drivers.push(driver);

            if(driver.devices && driver.devices.length>0) {
                // update path for all devices
                for (let j = 0, _j = driver.devices.length; j < _j; j++) {
                    let dev = driver.devices[j];
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
