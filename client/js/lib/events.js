var EventEmitter = function() {
	this.__events = {};
};

EventEmitter.prototype.addListener = function(event, listener) {
    if (!this.__events[event]) {
        this.__events[event] = [];
    }
    
    this.__events[event].push(listener);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(event, listener) {
	var self = this;

	var listenerClosure = function() {
		listener.apply(self, arguments);
		
		self.removeListener(event, listenerClosure);
	};
	
	this.on(event, listenerClosure);
};

EventEmitter.prototype.removeListener = function(event, listener) {
    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            if (this.__events[event][i] === listener) {
                this.__events[event].splice(i, 1);
            }
        }
    }
};

EventEmitter.prototype.removeAllListeners = function(event) {
	this.__events[event] = [];
};

EventEmitter.prototype.emit = function() {
    var args = Array.prototype.slice.call(arguments);
    var event = args.shift();

    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            this.__events[event][i].apply(this, args);
        }
    }
};

EventEmitter.prototype.listeners = function(event) {
    return this.__events[event] || [];
};

