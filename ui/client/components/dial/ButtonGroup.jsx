import React from 'react';
import {scaleLinear, scaleBand} from "d3-scale";


export default class ButtonGroup extends React.Component {

    componentWillMount() {
        this.scale = scaleLinear().domain(this.props.range ? this.props.range : [0, 1.0]);
        this.band = scaleBand()
            .domain(React.Children.map(this.props.children, (child) => {
                return child.props.id;
            }))
            .range(this.props.arcrange ? this.props.arcrange : [0, 1.0])
            .paddingInner(0.05);
        //console.log("button-group:   scale:", this.scale, "   band:", this.band, "   props:", this.props);

        //React.Children.forEach(this.props.children, function(child) {
        //    console.log(child.props.id, child);
        //});


/*
        this.ctrl = new ButtonGroupIndicator({
            lane: {
                ordinal: 0,
                //offset: dial.getLane(-1).offset,     // make this lane start at the same offset as lane 1
                alignment: this.props.alignment
            },
            arcrange: this.props.arcrange,
            button_options: {
                background: {
                    fill: '#222'
                    //margin: { inner: dial.progress.lane.offset - dial.speed.lane.offset }
                },
                text: {
                    size: '90px'
                }
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
*/
    }

    renderChildren() {
        var index=0;
        if(this.band) {
            var group = this;
            var bandwidth = this.band.bandwidth();
            return React.Children.map(this.props.children, function (child) {
                var band = group.band(child.props.id);
                return React.cloneElement(child, {
                    index: index++,
                    lane: group.props.lane,
                    group: {
                        control: group,
                        band: group.band
                    },
                    arcrange: [band, band + bandwidth]
                });
            });
        }
    }

    render() {
        return (<g id={this.props.id} className={`plugin plugin-dialindicator button-group`}>{
            this.renderChildren()
        }</g>);
    }
}