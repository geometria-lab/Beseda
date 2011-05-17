var LongPollingTransport      = require('./transports/long_polling'),
    JSONPLongPollingTransport = require('./transports/jsonp_long_polling');


module.exports = Transport = function() {
	this._url          = null;
	this._typeSuffix   = null;
	this._connectionID = null;
	this._emitter      = null;

	this.__sendQueue = [];
};

Transport._transports = {
	longPolling      : LongPollingTransport,
	JSONPLongPolling : JSONPLongPollingTransport
};

Transport.getTransport = function(options) {
	for (var i = 0; i < options.transports.length; i++) {
		var transport = Transport._transports[options.transports[i]];
		if (transport) {
			return new transport;
		} else {
			throw Error('Ivalid transport ' + options.transports[i]);
		}
	}
};

Transport.prototype.connect = function(host, port, ssl) {
	throw Error('Abstract method calling.');
};

Transport.prototype.send = function(data) {
	throw Error('Abstract method calling.');
};

Transport.prototype.disconnect = function() {
	throw Error('Abstract method calling.');
};

Transport.prototype.setEmitter = function(emitter) {
	this._emitter = emitter;
};

Beseda.Transport.prototype._handleConnection = function(id) {
	this._connectionID = id;

	if (this._emitter) {
		this._emitter.emit('connect', this._connectionID);
	}
	
	while(this.__sendQueue.length) {
		this.send(this.__sendQueue.shift());
	}
};

Beseda.Transport.prototype._handleMessage = function(messages) {
	if (messages) {
		while(messages.length) {
			this._emitter.emit('message', messages.shift());
		}
	}
};

Beseda.Transport.prototype._enqueue = function(message) {
	this.__sendQueue.push(message);
};