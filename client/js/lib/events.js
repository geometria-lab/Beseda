Beseda.prototype.on = function(event, listener) {
    if (!(event in this._events)) {
        this._events[event] = [];
    }
    this._events[event].push(listener);
}

Beseda.prototype.addListener = Beseda.prototype.on;

Beseda.prototype.removeListener = function(event, listener) {
    if (event in this._events) {
        for (var i = 0, length = this._events[event].length; i < length; i++) {
            if (this._events[event][i] == listener) {
                this._events[event].splice(i, 1);
            }
        }
    }
}

Beseda.prototype.removeAllListeners = function(event) {
    if (event in this._events) {
        this._events[event] = [];
    }
}

Beseda.prototype.emit = function() {
    var event = arguments.shift();

    if (event in this._events) {
        for (var listener in this._events[event]) {
            listener.apply(this, arguments);
        }
    }
}

Beseda.prototype.listeners = function(event) {
    return event in this._events ? this._events[event] : [];
}