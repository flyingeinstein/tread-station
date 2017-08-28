/*
 ./client/components/App.jsx
 */
import React from 'react';


export default class TreadmillControl extends React.Component {
    render() {
        return <g className="status">
            <text className="status-indicator" textAnchor="middle" fontSize="100px" x="0" y="-500">{this.props.status.active ? "Running":"Idle"}</text>
            <text className="speed-indicator" textAnchor="middle" fontSize="140px" x="0" y="-320">{this.props.status.active ? Number(this.props.status.currentSpeed).toFixed(1) : ""}</text>
            <text className="running-time" textAnchor="middle" fontFamily="Verdana" fontSize="240px" x="0" y="100">{this.props.status.timeDisplay}</text>
        </g>;
    }
};