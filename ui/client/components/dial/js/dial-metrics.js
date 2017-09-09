

function polar2rect(radius, angle, offset)
{
    if(offset==null) offset={x:0, y:0};
    angle += -Math.PI/2;
    return {
        x: offset.x + radius*Math.cos(angle),
        y: offset.y + radius*Math.sin(angle)
    };
}

export var Units = {
    pixel: function(u) { return Number(u.replace("px","")); }
};
