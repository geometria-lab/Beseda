var util = require('util')

var Transport = module.exports = function() {
    this._connectionID = null;
    this._emitter      = null;

	this._isConnected  = false;

	this._typeSuffix = null;

    this.__sendQueue = [];
	this.__pendingMessages = {};
};

Transport._transports = {
	'longPolling'      : require('./transports/long_polling.js'),
	'webSocket'        : require('./transports/web_socket.js')
};

Transport.getTransport = function(options) {
	var transport = Transport._transports[options.transport];
    if (transport) {
        return new transport;
    } else {
        throw Error('Ivalid transport ' + options.transport);
    }
};

Transport.prototype.connect = function(host, port, ssl) {
	throw Error('Abstract method calling.');
};

Transport.prototype.send = function(messages) {
	if (this._isConnected) {
		var i = messages.length - 1;
		while (i >= 0) {
			this.__pendingMessages[messages[i].id] = true;
			i--;
		}

		this._doSend(JSON.stringify(messages));
	} else {
		this._enqueue(messages);
	}
};

Transport.prototype._doSend = function(data) {
	throw Error('Abstract method calling.');
};

Transport.prototype.disconnect = function() {
	throw Error('Abstract method calling.');
};

Transport.prototype.setEmitter = function(emitter) {
	this._emitter = emitter;
};

Transport.prototype._handleConnection = function(id) {
	this._connectionID = id;

	if (this._emitter) {
		this._emitter.emit('connect', this._connectionID);
	}
	
	while(this.__sendQueue.length) {
		this.send(this.__sendQueue.shift());
	}
};

Transport.prototype._handleMessages = function(messages) {
	var message;
	while(messages && messages.length) {
		message = messages.shift();

		this._emitter.emit('message', message);

		delete this.__pendingMessages[message.id];
	}
};

Transport.prototype._handleError = function(error) {
    for (var id in this.__pendingMessages) {
		 this._emitter.emit('message:' + id, error);
	}
	this._emitter.emit('error', error);

	this.__pendingMessages = {};
};

Transport.prototype._decodeData = function(data) {
	return JSON.parse(data);
}

Transport.prototype._enqueue = function(message) {
	this.__sendQueue.push(message);
};
