

function Aggregate(initialValue)
{
    Aggregate.current=initialValue;
    this.clear(initialValue);
    return this;
}

Aggregate.prototype.average = function()
{
    return this.sum / this.count;
}

Aggregate.prototype.add = function(value, weight)
{
    value = Number(value); weight = Number(weight);
    this.sum += value;
    this.count += weight;
    if(this.min==null || value < this.min)
        this.min = value;
    if(this.max==null || value > this.max)
        this.max = value;
}

Aggregate.prototype.clear = function(initialValue)
{
    this.current = initialValue;
    if(initialValue!=null) {
        initialValue = Number(initialValue);
        this.sum = initialValue;
        this.count = 1;
        this.max = initialValue;
        this.min = initialValue;
    } else {
        this.sum = this.count = this.average = 0;
        this.min = this.max = null;
    }
}

module.exports = Aggregate;
