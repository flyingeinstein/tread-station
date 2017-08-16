import React from 'react';


export default class ButtonGroup extends React.Component {
    render() {
        return (<g id={this.props.id} className={`plugin plugin-dialindicator`}>
            {this.props.children}
        </g>);
    }
}