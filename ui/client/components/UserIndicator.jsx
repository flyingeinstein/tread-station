import React from 'react';


export default class UserIndicator extends React.Component {

    render() {
        return <g className="status">
            <text className="status-indicator" textAnchor="middle" fontSize="100px" x="0" y="420">{this.props.user.name}</text>
        </g>;
    }
};