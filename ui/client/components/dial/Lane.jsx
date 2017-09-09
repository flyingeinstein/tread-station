import React from 'react';
import * as Metrics from './js/dial-metrics.js';
import {arc} from "d3-shape";


export default class Lane extends React.Component {
    componentWillMount() {
        var metrics = {
            offset: Metrics.Units.pixel(this.props.radius),
            width: this.props.width ? Metrics.Units.pixel(this.props.width) : 100,
            margin: {
                inner: 5,
                outer: 5
            }
        };
        metrics.middle = metrics.offset + metrics.width/2;
        this.lane = {
            ordinal: this.props.lane,
            width: metrics.width,
            alignment: this.props.alignment,
            metrics: metrics,
            arc: arc()
                .startAngle(function (angleStart, angleEnd) { return angleStart; })
                .endAngle(function (angleStart, angleEnd) { return angleEnd; })
                .innerRadius(function(angleStart, angleEnd, margin) { return metrics.offset + ((margin!=null && margin.inner!=null) ? margin.inner : 0); })
                .outerRadius(function(angleStart, angleEnd, margin) { return metrics.offset + ((margin && margin.width) ? margin.width : metrics.width) + ((margin && margin.outer) ? margin.outer : 0); }),
            tick: arc()
                .startAngle(function (angle, width) { return angle-width; })
                .endAngle(function (angle, width) { return angle+width; })
                .innerRadius(function(angle, width, margin) { return metrics.offset + ((margin && margin.inner) ? margin.inner : 0); })
                .outerRadius(function(angle, width, margin) { return metrics.offset + metrics.width + ((margin && margin.outer) ? margin.outer : 0); })
        };
    }

    componentDidMount() {

        //React.Children.forEach(this.props.children, (c) => {
        //});
    }

    render() {
        return (<g id={this.props.id} className={`lane lane${this.props.lane}`} opacity="1">{
            React.Children.map(this.props.children, (child) => {
                return React.cloneElement(child, { lane: this.lane });
            })
        }</g>);
    }
}