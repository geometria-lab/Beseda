//TODO: если ошибка на отсылку переподключение с отправкой!
var Beseda = function(options) {
	Beseda._super.constructor.call(this);

    this.setOptions({
        host : document.location.hostname,
        port : 4000,
        ssl  : false,

        transports : [ 'longPolling', 'JSONPLongPolling' ]
    }, options);

    this._events       = {};
    this._status       = Beseda._statuses.DISCONNECTED;
    this._messageQueue = [];

    this.router   = new Beseda.Router(this);
    this.clientId = null;
	this.__channels = [];

    this._io = new Beseda.IO(this.options);

    var self = this;
    this._io.on('message', function(message) {
        self.router.dispatch(message);
    });
    
    this._io.on('error', function() {
 		self._status = Beseda._statuses.DISCONNECTED;
		setTimeout(function(){ self.connect(); }, 1000)
    });
};

Beseda.EventEmitter = function() {
	this.__events = {};
    this.__maxListeners = 10;
};

Beseda.EventEmitter.prototype.addListener = function(event, listener) {
    if (!this.__events[event]) {
        this.__events[event] = [];
    }

    this.__events[event].push(listener);

    if (this.__events[event].length > this.__maxListeners) {
        alert('Warning: possible EventEmitter memory leak detected. ' + this.__events[event].length + ' listeners added. Use emitter.setMaxListeners() to increase limit');
    }
};

Beseda.EventEmitter.prototype.setMaxListeners = function(count) {
    this.__maxListeners = count;

    return this;
}

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

Beseda.utils = {
    cloneObject : function(object) {
        return this.mergeObjects({}, object);
    },

    mergeObjects : function(object, extend) {
        for (var p in extend) {
            try {
                if (extend[p].constructor == Object) {
                    object[p] = this.mergeObjects(object[p], extend[p]);
                } else {
                    object[p] = extend[p];
                }
            } catch (e) {
                object[p] = extend[p];
            }
        }

        return object;
    }, 

    inherits : function(Class, Parent) {
		var Link = function() {};
		Link.prototype = Parent.prototype;

		Class.prototype = new Link();
		Class.prototype.constructor = Class;
		Class._super = Class.prototype._super = Parent.prototype;

		Link = null;
	}
};

Beseda.utils.inherits(Beseda, Beseda.EventEmitter);

Beseda.prototype.isConnected = function() {
    return this._status == Beseda._statuses.CONNECTED;
};

Beseda.prototype.isDisconnected = function() {
    return this._status == Beseda._statuses.DISCONNECTED;
};

Beseda.prototype.isConnecting = function() {
    return this._status == Beseda._statuses.CONNECTING;
};

Beseda.prototype.subscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/subscribe', message);

    this.log('Beseda send subscribe request', message);

    this.__channels[channel] = message;

	if (callback) {
    		this.on('subscribe:' + message.id, callback);
    }
};

Beseda.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/unsubscribe', message);

    this.log('Beseda send unsubscribe request', message);

    if (callback) {
    		// TODO: implement once()
        this.on('unsubscribe:' + message.id, callback);
    }
};

Beseda.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this._sendMessage(channel, { data : message });

    this.log('Beseda send publish request', message);

    if (callback) {
        this.on('message:' + channel + ':' + message.id, callback);
    }

    return this;
};

Beseda.prototype.connect = function(callback, additionalMessage) {
    if (this.isConnected()) {
        return false;
    }

    this._status = Beseda._statuses.CONNECTING;

    var self = this;

    this._io.once('connect', function(connectionID) {

        self.clientId = connectionID;

        var message = self._createMessage('/meta/connect', additionalMessage);
        
    		self._io.send(message);
    		
   		self.log('Beseda send connection request', message);
    });

    this._io.connect();

    for (var key in this.__channels) {
    		this._sendMessage('/meta/subscribe', this.__channels[key]);
    }
};

Beseda.prototype.disconnect = function() {
    this._io.disconnect();
    
	this.clientId = null;
	this.__channels = [];

	this._status = Beseda._statuses.DISCONNECTED;
};

Beseda.prototype.setOptions = function(options, extend) {
    this.options = Beseda.utils.mergeObjects(options, extend);
};

Beseda.prototype.log = function() {
    if ('console' in window && 'log' in console) {
		console.log.apply(console, arguments);
    }
};

Beseda.prototype._sendMessage = function(channel, message) {
    if (this.isDisconnected()) {
        throw 'You must connect before send message';
    }

    if (this.isConnecting()) {
        this._messageQueue.push(channel, message);
    } else {
        this._io.send(this._createMessage(channel, message));
    }

    return message;
};

Beseda.prototype._createMessage = function(channel, message) {
    message = message || {};

    message.id       = this.clientId + '_' + ++Beseda.__lastMessageID;
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};

Beseda.prototype._onDisconnect = function() {
    this._status = Beseda._statuses.DISCONNECTED;

    this.emit('disconnect');

    this.log('Beseda disconnected');
};

Beseda.prototype.flushMessageQueue = function() {
	var messages = [];
	while (this._messageQueue.length) {
		messages.push(this._createMessage(this._messageQueue.shift(), this._messageQueue.shift()));
	}
	this._io.send(messages);
};

Beseda._statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

Beseda.__lastMessageID = 0;




