/*
 ./client/components/App.jsx
 */
import React from 'react';
import Dial from './dial/Dial.jsx';
import Lane from './dial/Lane.jsx';
import ButtonGroup from "./dial/ButtonGroup.jsx";
import Button from "./dial/Button.jsx";
import "shapes.css";


export default class TreadmillControl extends React.Component {

    stop() {
        console.log("stop");
    }

    reset() {
        console.log("reset");
    }

    incrementSpeed() {
        console.log("increment-speed");
    }

    decrementSpeed() {
        console.log("decrement-speed");
    }

    render() {
        return (
            <div className="treadmill-control" style={{textAlign: 'center'}}>
                <button id="stop" className="stop shape-tag right" onClick={this.stop}>STOP</button>
                <button id="reset" className="reset shape-tag left" onClick={this.reset}>RESET</button>
                <Dial id="speed-control">
                    <Lane id="root" lane="0" >
                        <ButtonGroup style={{ alignment: 'bottom', arcrange: [ 0.83*Math.PI, 1.17*Math.PI ] }}>
                            <Button id="speed-increase" caption="$up"   onClick={this.incrementSpeed} />
                            <Button id="speed-decrease" caption="$down" onClick={this.decrementSpeed} />
                        </ButtonGroup>
                    </Lane>
                    <Lane id="presets" lane="3" />
                    <Lane id="incline" lane="2" />
                </Dial>
            </div>);
    }
}
