import React from 'react';
import {scaleLinear, scaleBand} from "d3-scale";


export default class Meter extends React.Component {
    componentWillMount() {
        let lane = this.props.lane;
        this.scale = scaleLinear()
            .domain(this.props.domain ? this.props.domain : [0, 1.0])
            .range(this.props.arcrange ? this.props.arcrange : [0, 1.0]);
        this.ticks = this.scale.ticks(this.scale.domain()[1]*10);
        this.majors = this.scale.ticks(this.scale.domain()[1]); this.majors.pop();
        this.radius_ordinals = -lane.metrics.offset-lane.metrics.width/2;
        this.radius_outer = lane.metrics.offset+lane.metrics.width+5;
        this.setState({ value: this.props.value });
        setTimeout(function() {
            this.setValue(8.4);
        }.bind(this), 3500);
    }

    setValue(v) {
        this.setState((prevState, props) => {
            return {value: v};
        });
    }

    getValue() {
        return this.state.value;
    }

    render() {
        return <g id={this.props.id} className={`indicator meter-indicator`} style={{cursor:'hand'}} onClick={this.props.onClick} data-index={this.props.index}>
            <g className="dial-face">
                <circle className="background-circle" r={this.radius_outer} filter="url(#fe3)" />
                <g className="ticks">{
                    React.Children.map(this.ticks, (t) => {
                        let sp = this.scale(t);
                        var major = t === Math.floor(t);
                        let dxAngle = major ? 0.015 : 0.003;
                        return <path className={`tick ${major?'major-tick':'minor-tick'}`} d={this.props.lane.tick(sp, dxAngle)} />
                    })
                }</g>
                <g className="labels">{
                    React.Children.map(this.majors, (d) => {
                        let r = this.scale(d+0.5) * 180 / Math.PI;
                        return <text className="dial-ordinals" textAnchor="middle" transform={`translate(0,${this.radius_ordinals}) rotate(${r} 0 ${-this.radius_ordinals})`} >{d}</text>
                    })
                }</g>
            </g>
            <g className="indicators">
                <path className="current-indicator" d={this.props.lane.tick(this.scale(Number(this.state.value)), 0.025)} />
            </g>
        </g>
    }
}