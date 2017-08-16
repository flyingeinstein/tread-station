import React from 'react';


export default class Button extends React.Component {
    render() {
        return (<g id={this.props.id} className={`plugin plugin-dialindicator button-indicator`} style={{cursor:'hand'}} onClick={this.props.onClick}>
            <path className="background" fill="#222" d="M-13.255495617683108,967.9092373957021A968,968,0,0,1,-492.75209044635903,833.1982821398177L-346.82009737904264,586.4407578383269A681.3199999999999,681.3199999999999,0,0,0,-9.32978747338828,681.2561173785534Z"></path>
            <path className="glyph" d="M -20 -10 L 0 10 L 20 -10" strokeWidth="4" stroke="whitesmoke" fill="transparent" transform="translate(0,842.16) rotate(15.692307692307708,0,-842.16) scale(4)"></path>
        </g>);
    }
}