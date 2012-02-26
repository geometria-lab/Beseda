var plugins = require('./plugins');

var Beseda = function() {
    this.__server = null;
    this.__plugins = [];
    this.__pluginCallbacks = {};
};

Beseda.prototype.use = function(plugin) {
    this.__plugins.push(plugin);

    for (var name in plugin) {
        if (typeof plugin[name] == "function" && name.indexOf('Callback') !== false) {
            if (!this.__pluginCallbacks[name]) {
                this.__pluginCallbacks[name] = [];
            }
            this.__pluginCallbacks[name].push(plugin);
        }
    }

    this.callPlugins('initialize', this);
};

Beseda.prototoype.callPlugins = function() {
    var args  = Array.prototype.slice.call(arguments),
        name  = args.shift() + 'Callback',
        calls = 0;

    if (this.__pluginCallbacks[name]) {
        for (var i = 0; i < this.__pluginCallbacks[name].length; i++) {
            var plugin = this.__pluginCallbacks[name][i];
            plugin.apply(plugin, args);
        }
    }

    return calls;
}

Beseda.prototype.callFirstPlugin = functon() {
    var args  = Array.prototype.slice.call(arguments),
        name  = args.shift() + 'Callback';

    if (this.__pluginCallbacks[name]) {
        var plugin = this.__pluginCallbacks[name][0];
        return plugin.apply(plugin, args);
    } else {
        return false;
    }
}

Beseda.prototype.createServer = require('./server.js');

module.exports = Beseda;