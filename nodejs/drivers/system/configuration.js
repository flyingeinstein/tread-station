//
// System Configuration driver
// holds configuration information that any driver can retrieve, add or modify.
//

class Configuration {
    constructor() {
        this.name = "Configuration";
        this.devicePath = "configuration";
        this.description = "Provides shared configuration between drivers";
        this.devices = [];
        this.driver = {};
    }

    disabled_probe() {
        this.addSection("main", {
            simulation: false
        });
        if(0) {
            this.addSection("autopace", {
                simulation: false
            });
        }
    }

    addSection(name, data) {
        this.devices.push(this[name] = new Configuration.Section(name, data));
    }
}

class ConfigurationSection {
    constructor(name, data) {
        this.name = name;
        this.data = data ? data : {};

        // import all the props
        //for(k in data) {
        //    if(data.hasOwnProperty(k))
        //        this[k] = data[k];
        //}
    }
}

Configuration.Section = ConfigurationSection;
module.exports = Configuration;
