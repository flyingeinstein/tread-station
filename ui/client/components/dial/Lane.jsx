import React from 'react';


export default class Lane extends React.Component {
    componentDidMount() {
        React.Children.forEach(this.props.children, (c) => {
            if(c.props.style)
                console.log(c.props.style);
            console.log(c);
        });
    }

    render() {
        return (<g id={this.props.id} className={`lane lane${this.props.lane}`} opacity="1">
            {this.props.children}
        </g>);
    }
}