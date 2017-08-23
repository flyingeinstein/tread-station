import React from 'react';


export default class Button extends React.Component {
    constructor(props) {
        super(props);
        this.buttonClicked = this.buttonClicked.bind(this);
    }

    componentWillMount() {
        this.setState((prevState, props) => {
            return {value: this.props.value};
        });    }

    calc_arc() {
        var range = this.props.arcrange;
        return this.props.lane.arc(range[0], range[1], 5);
    }

    getValue() {
        return this.state.value;
    }

    setValue(v) {
        this.setState((prevState, props) => {
            return {value: v};
        });
    }

    buttonClicked()
    {
        this.props.onClick(this);
    }

    render() {
        let r = (this.props.arcrange[0] + this.props.arcrange[1])/2;
        let rotate = (-90 + r * 180 / Math.PI);
        return (<g id={this.props.id} className={`plugin plugin-dialindicator button-indicator`} style={{cursor:'hand'}} onClick={this.buttonClicked} data-index={this.props.index}>
            <path className="band" value={this.props.value} d={this.calc_arc()} />
            <text className="caption button-caption" textAnchor="middle" x={this.props.lane.metrics.middle} y={0} dy={40} transform={`rotate(${rotate})`}>{this.props.value}</text>
        }</g>);
    }
}