import React from 'react';


export default class Button extends React.Component {
    calc_arc() {
        var range = this.props.arcrange;
        console.log("range", range);
        return this.props.lane.arc(range[0], range[1], 5);
    }

    render() {
        return (<g id={this.props.id} className={`plugin plugin-dialindicator button-indicator`} style={{cursor:'hand'}} onClick={this.props.onClick} data-index={this.props.index}>
            <path className="band" d={this.calc_arc()} />
        }</g>);
    }
}