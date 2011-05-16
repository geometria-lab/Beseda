Beseda.EventEmitter = function() {
	this.__events = {};
};

Beseda.EventEmitter.prototype.addListener = function(event, listener) {
    if (!this.__events[event]) {
        this.__events[event] = [];
    }
    
    this.__events[event].push(listener);
};

Beseda.EventEmitter.prototype.on = Beseda.EventEmitter.prototype.addListener;

Beseda.EventEmitter.prototype.once = function(event, listener) {
	var self = this;

	var listenerClosure = function() {
		listener.apply(self, arguments);
		
		self.removeListener(event, listenerClosure);
	};
	
	this.on(event, listenerClosure);
};

Beseda.EventEmitter.prototype.removeListener = function(event, listener) {
    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            if (this.__events[event][i] === listener) {
                this.__events[event].splice(i, 1);
            }
        }
    }
};

Beseda.EventEmitter.prototype.removeAllListeners = function(event) {
	this.__events[event] = [];
};

Beseda.EventEmitter.prototype.emit = function() {
    var args = Array.prototype.slice.call(arguments);
    var event = args.shift();

    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            this.__events[event][i].apply(this, args);
        }
    }
};

Beseda.EventEmitter.prototype.listeners = function(event) {
    return this.__events[event] || [];
};

