(function() {
    beseda.events = {}

    var EventEmitter = function() {
        this._listeners = {};
    };

    EventEmitter.prototype.emit = function(type) {
        if (this._listeners[type] !== undefined) {
	        var args = Array.prototype.slice.call(arguments);
	        args.shift();
	        
            var i = this._listeners[type].length - 1;
            while (i >= 0) {
                this._listeners[type][i].apply(this, args);

                i--;
            }
        }
    };

    EventEmitter.prototype.addListener = function(type, handler) {
        var result = true;

        if (this._listeners[type] === undefined) {
            this._listeners[type] = [];
        }

        if (!this.hasSubscription(type, handler)) {
            this._listeners[type].push(handler);
        } else {
            result = false;
        }

        return result;
    };

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.removeListener = function(type, handler) {
        if (this._listeners[type] !== undefined) {
            var i = this._listeners[type].length - 1;

            while (i >= 0) {
                if (this._listeners[type][i] === handler) {
                    this._listeners[type].splice(i, 1);
                    return true;
                }

                i--;
            }
        }

        return false;
    };

    EventEmitter.prototype.hasSubscription = function(type, handler) {
        if (this._listeners[type] !== undefined) {
            var i = this._listeners[type].length - 1;
            while (i >= 0) {
                if (this._listeners[type][i] === handler) {
                    return true;
                }

                i--;
            }
        }

        return false;
    };

     beseda.events.EventEmitter = EventEmitter;
})();