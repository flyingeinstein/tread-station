const glob = require("glob");
const fs = require('fs');
const postal = require('postal');

function DriverTree(props)
{
    this.driverPath = "./drivers/";
    this.root = {};
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
    return this.__enumerate(this.root, null);
};

DriverTree.prototype.$ = function(node, name)
{
    if(name===undefined) {
        name = node;
        node = this.root;
    }
    let comps = name.split("/");
    while(comps.length>0) {
        let comp = comps.shift();
        if(comps.length===0 && Array.isArray(node.drivers)) {
            // first check if this is a driver name
            for(let i=0, _i=node.drivers.length; i<_i; i++) {
                let driver = node.drivers[i];
                if(driver.name === comp || driver.devicePath===comp)
                    return driver;
            }
        }

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
            this.__probe(node[c], props);
        }
    }.bind(this));
};

DriverTree.prototype.probe = function(props)
{
    this.__resolveDependancies(this.root);

    props.addSection = function(name, data) {
        return this[name] = data;
    }.bind(props);

    props.readSection = function(name, default_value)
    {
        let filepath = "../"+name+".conf";
        let added = false;
        if(fs.existsSync(filepath)) {
            let stat = fs.lstatSync(filepath);
            if (stat.isFile()) {
                let text = fs.readFileSync(filepath, 'utf8');
                let data = JSON.parse(text);
                if (data) {
                    //console.log("read configuration section " + name, data);
                    return this.addSection(name, data); //now it an object
                }
            }
        }
        return (default_value)
            ? this.addSection(name, default_value)
            : false;
    }.bind(props);


    // initiate the probing
    this.__probe(this.root, props);
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
    if(typeof driverinfo.klass !== "function") {
        console.log("driver file "+driverinfo.path+"/"+driverinfo.name+" contains no class");
        return null;
    } else {
        let driver = new driverinfo.klass();
        driver.info = driverinfo;
        driver.refs = {};
        driver.probed = false;

        this.drivers.push(driver);

        return driver;
    }
};

DriverTreeNode.prototype.probe = function(props)
{
    this.probed = true;
    let _drivers = this.drivers;
    this.drivers = [];

    for(let i=0, n=_drivers.length; i<n; i++) {
        let driver = _drivers[i];
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
            //console.log("driver has no probe function: ", driver);
            continue;
        }
        driver.tree = this.tree;
        driver.node = this;
        driver.probed = true;

        // get the driver control class to probe for devices on the system
        let defer = driver.probe(props);
        let _then = function(probe_succeeded) {
            //console.log("probe: "+driver.name+" returned ", probe_succeeded);
            if(!probe_succeeded)
                return;

            // create a bus channel for the driver
            if(driver.bus===undefined)
                driver.bus = postal.channel(driver.devicePath);

            // add driver to list of valid drivers
            this.drivers.push(driver);

            if(driver.devices && driver.devices.length>0) {
                // update path for all devices
                for (let j = 0, _j = driver.devices.length; j < _j; j++) {
                    let dev = driver.devices[j];
                    dev.node = this;
                    if(dev.bus === undefined)
                        dev.bus = driver.bus;
                    this.devices.push(dev);
                }
            }
        }.bind(this);

        // TODO: I am enabling this code to detect promise returned and delay the inner bracket code
        if(defer && typeof defer.then==="function")
            defer.then(_then, (_driver) => _then(_driver, false));
        else
            _then(defer);
    }
};


DriverTree.Node = DriverTreeNode;

module.exports = DriverTree;
