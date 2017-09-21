/*
 ./client/components/App.jsx
 */
import React from 'react';


export default class TreadmillStatus extends React.Component {
    getStatus() {
        return !this.props.connection.connected
            ? "disconnected"
            : this.props.status.headline;
    }

    render() {
        return <g className="status">
            <text className="status-indicator" textAnchor="middle" fontSize="100px" x="0" y="-500">{this.getStatus()}</text>
            <text className="speed-indicator" textAnchor="middle" fontSize="160px" x="0" y="-320">{this.props.status.active ? Number(this.props.status.currentSpeed).toFixed(1) : ""}</text>
            <text className="running-time" textAnchor="middle" fontFamily="Verdana" fontSize="320px" x="0" y="100">{this.props.status.timeDisplay}</text>
        </g>;
    }
};