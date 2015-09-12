var fs = require('fs');
var Q = require('q');

function bbbPWM(pwmPath, period) {
    bbbPWM.PERIOD = period;
    bbbPWM.RUN_PATH = pwmPath + 'run';
    bbbPWM.DUTY_PATH = pwmPath + 'duty';
    bbbPWM.PERIOD_PATH = pwmPath + 'period';
    this.configureDevice();
}

bbbPWM.prototype.writeFile = function (file, content) {
    var deferred = Q.defer();
    fs.writeFile(file, content, function (error) {
        if (error) {
            deferred.reject(error);
        }
        else {
            console.log('writeFile complete: ' + file);
            deferred.resolve();
        }
    });
    return deferred.promise;
};

bbbPWM.prototype.setDuty = function (duty) {
    try {
        fs.writeFile(bbbPWM.DUTY_PATH, Math.floor(Number(duty) * 1000));
    }
    catch (e) {
        console.log('setDuty error: ' + e);
    }
};

bbbPWM.prototype.turnOff = function () {
    this.writeFile(bbbPWM.RUN_PATH, '0');
};

bbbPWM.prototype.turnOn = function () {
    this.writeFile(bbbPWM.RUN_PATH, '1');
};

bbbPWM.prototype.configureDevice = function () {
    var _this = this;

    this.writeFile(bbbPWM.RUN_PATH, '1').then(function () {
        return _this.writeFile(bbbPWM.PERIOD_PATH, bbbPWM.PERIOD);
    }).then(function () {
            console.log('PWM Configured...');
        }, _this.errorHandler).done();
};

bbbPWM.errorHandler = function (error) {
    console.log('Error: ' + error.message);
};

module.exports = bbbPWM;