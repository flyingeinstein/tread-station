'use strict';
const PWMController = require('./pwm.js');

class NordicController extends PWMController {
	constructor(props) {
		super(props);
        this.name = "NordicTrak (PWM)";
	}




};

module.exports = NordicController;

