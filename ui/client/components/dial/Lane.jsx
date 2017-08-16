import React from 'react';


export default class Lane extends React.Component {
    render() {
        return (<g id={this.props.id} className={`lane lane${this.props.lane}`} opacity="1">
            {this.props.children}
        </g>);
    }
}