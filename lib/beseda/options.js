Options = module.exports = function(options, extend) {
    this.setOptions(options, extend)
}

Options.prototype.options = {}

Options.prototype.setOptions = function(options, extend) {
    function merge(object, extendObject) {
        for (var p in extendObject) {
            try {
                if (extendObject[p].constructor == Object) {
                    object[p] = merge(object[p], extendObject[p]);
                } else {
                    object[p] = extendObject[p];
                }
            } catch (e) {
                object[p] = extendObject[p];
            }
        }
    }

    this.options = merge(options, extend);
}