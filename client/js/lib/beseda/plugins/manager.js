var PluginsManager = function() {
    this.__plugins = [];
    this.__pluginCallbacks = {};
};

PluginsManager.prototype.use = function(plugin) {
    this.__plugins.push(plugin);

    for (var name in plugin) {
        if (typeof plugin[name] === "function" && name.indexOf('Callback') !== false) {
            if (this.__pluginCallbacks[name] === undefined) {
                this.__pluginCallbacks[name] = [];
            }
            this.__pluginCallbacks[name].push(plugin);
        }
    }

    this.callPlugins('initialize', this);
};

PluginsManager.prototoype.callPlugins = function() {
    var p = this.__separateNameAndArguments(arguments);

    if (this.__pluginCallbacks[p.name] !== undefined) {
        for (var i = 0; i < this.__pluginCallbacks[p.name].length; i++) {
            var plugin = this.__pluginCallbacks[p.name][i];
            plugin.apply(plugin, p.args);
        }
    }

    return this;
};
/*
PluginsManager.prototype.callFirstPlugin = function() {
    var p = this.__separateNameAndArguments(arguments);

    if (this.__pluginCallbacks[p.name] !== undefined) {
        var plugin = this.__pluginCallbacks[p.name][0][p.name];
        return plugin.apply(plugin, p.args);
    } else {
        return false;
    }
};
*/
PluginsManager.prototype.__separateNameAndArguments = function(args) {
    var length = args.length;

    if (length > 2) {
        var slicedArgs = new Array(length - 1);

        for (var i = 1; i < length - 1; ++i) {
            slicedArgs[i] = args[i];
        }
    } else {
        var slicedArgs  = [ args[1] ];
    }

    return {
        'name' : args[0] + 'Callback',
        'args' : slicedArgs
    };
};

if (typeof process !== 'undefined' && typeof process.title !== 'undefined') {
    module.exports = PluginsManager;
}