import React from 'react';
import {scaleLinear, scaleBand} from "d3-scale";


export default class Meter extends React.Component {
    componentWillMount() {
        let lane = this.props.lane;
        this.scale = scaleLinear()
            .domain(this.props.domain ? this.props.domain : [0, 1.0])
            .range(this.props.arcrange ? this.props.arcrange : [0, 1.0]);
        this.radius = {
            inner: lane.metrics.offset,
            outer: lane.metrics.offset+lane.metrics.width
        };
        this.setState({ value: this.props.value });
        this.regions = this.props.regions ? this.props.regions : [1.0];
        setTimeout(function() {
            this.setValue(0.8);
        }.bind(this), 3500);
    }

    setValue(v) {
        this.setState((prevState, props) => {
            return {value: Number(v)};
        });
    }

    getValue() {
        return this.state.value;
    }

    render() {
        let from = {
            domain: 0.0,
            scale: this.scale(0.0)
        };
        return <g className={`indicator range-indicator ${this.props.className}`}>
            <g className="regions">{
                React.Children.map(this.regions, (region, index) => {
                    let to = {
                        domain: region,
                        scale: this.scale(region)
                    };
                    var arc = this.props.lane.arc(from.scale, to.scale, 0);
                    from = to;
                    return <path className={`band band-region${index}`} fillOpacity="0.5" d={arc} />
                })
            }</g>
            <g className="indicators">
                <path className="current-indicator" d={this.props.lane.tick(this.scale(this.state.value), 0.02)} />
            </g>
        </g>
    }
}