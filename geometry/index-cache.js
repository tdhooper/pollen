
function IndexCache(itemFactory, items) {
    this.items = items || [];
    this.indexMap = {};
    this.itemFactory = itemFactory;
}

IndexCache.prototype.get = function() {
    var key = this.getKey.apply(this, arguments);
    if (this.indexMap.hasOwnProperty(key)) {
        return this.indexMap[key];
    }
    var item = this.itemFactory.apply(this, arguments);
    this.items.push(item);
    var index = this.items.length - 1;
    this.indexMap[key] = index;
    return index;
};

IndexCache.prototype.getKey = function() {
    return [].slice.call(arguments).sort().join(',');
};

module.exports = IndexCache;
