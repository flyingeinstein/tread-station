import React from 'react';


export default class ButtonGroup extends React.Component {

    componentDidMount() {
        console.log("I am a buttonGroup");

        React.Children.forEach(this.props.children, function(child) {
            console.log(child.props.id, child);
        });

        this.ctrl = new ButtonGroupIndicator({
                lane: {
                    ordinal: 0,
                    //offset: dial.getLane(-1).offset,     // make this lane start at the same offset as lane 1
                    alignment: this.props.alignment
                },
                arcrange: this.props.arcrange,
                button_options: {
                    background: {
                        fill: '#222',
                        margin: { inner: dial.progress.lane.offset - dial.speed.lane.offset }
                    },
                    text: {
                        color: '#aaa',
                        size: '90px'
                    },
                    click: function(b) { if(b.name=="speed-increase") treadmill.increaseSpeed(); else treadmill.decreaseSpeed(); }
                },
                buttons: [
                    {
                        id: "speed-increase",
                        caption: "$up"
                    },
                    {
                        id: "speed-decrease",
                        caption: "$down"
                    }
                ]
            });
    }

    renderChildren() {
        var index=0;
        return React.Children.map(this.props.children, function(child) {
            //reacchild.props.index=2;
            //console.log(child);
            //return child;
            return React.cloneElement(child, { index: index++ });
        });
    }

    render() {
        return (<g id={this.props.id} className={`plugin plugin-dialindicator button-group`}>
            { this.renderChildren() }
        </g>);
    }
}