
Number.prototype.clamp = function(minV, maxV)
{
    if(this < minV)
        return minV;
    else if(this > maxV)
        return maxV;
    else
        return this;
};




