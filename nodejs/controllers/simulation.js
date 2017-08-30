'use strict';

class SimulationController {
	constructor(props) {
		this.name = "simulation";
		
	}

	probe() {
		// simulation always available
		return true;
	}

	open() {
		return true;
	}

	close() {
		return true;
	}

	// TODO: possibly we should be returning a promise here if actions do not immediately happen. I.e. when we issue a stop the controller
	// begins slowing down and then executes the promise when the machine is completely stopped.

	speed(val) {
		console.log("speed => "+val.toFixed(2));
		return true;
	}

	stop() {
		console.log("stop");
		return true;
	}


};

module.exports = SimulationController;
