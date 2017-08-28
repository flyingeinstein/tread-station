import React from 'react';
import glyphs from "./js/glyphs";


export default class Button extends React.Component {
    constructor(props) {
        super(props);
        this.buttonClicked = this.buttonClicked.bind(this);
    }

    componentWillMount() {
        this.setState((prevState, props) => {
            return {
                caption: this.props.caption ? this.props.caption : this.props.value,
                value: this.props.value
            };
        });    }

    calc_arc() {
        var range = this.props.arcrange;
        return this.props.lane.arc(range[0], range[1], 5);
    }

    getValue() {
        return this.state.value;
    }

    setValue(v) {
        this.setState((prevState, props) => {
            return { value: v };
        });
    }

    buttonClicked()
    {
        this.props.onClick(this);
    }

    renderCaption()
    {
        let r = (this.props.arcrange[0] + this.props.arcrange[1])/2;
        let rotate = (-90 + r * 180 / Math.PI);
        let caption = this.state.caption;
        if(caption==null)
            return null;
        if(caption.length>1 && caption[0]==='$') {
            var glyphname = caption.substr(1);
            var glyphcode = glyphs[glyphname];
            var yofs = this.props.lane.metrics.middle, xofs = 0;
            rotate -= 90.0;
            var scale = 4.0;
            if(glyphcode) {
                return <path className="glyph button-glyph" x={xofs} y={yofs} d={glyphcode} transform={`translate(${xofs},${yofs}) rotate(${rotate}, ${-xofs}, ${-yofs}) scale(${scale})`} />
            }
        } else {
            return <text className="caption button-caption" textAnchor="middle" x={this.props.lane.metrics.middle} y={0} dy={40} transform={`rotate(${rotate})`}>{this.props.value}</text>
        }
    }

    render() {
        return (<g id={this.props.id} className={`plugin plugin-dialindicator button-indicator`} style={{cursor:'hand'}} onClick={this.buttonClicked} data-index={this.props.index}>
            <path className="band" value={this.props.value} d={this.calc_arc()} />
            { this.renderCaption() }
        }</g>);
    }
}