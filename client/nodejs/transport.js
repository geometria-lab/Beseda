module.exports = Transport = function() {
	this._typeSuffix   = null;
	this._connectionID = null;
	this._emitter      = null;

	this.__sendQueue = [];
};

Transport._transports = {
	longPolling      : require('./transports/long_polling.js')
	//JSONPLongPolling : require('./transports/jsonp_long_polling.js')
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

Transport.prototype.send = function(data) {
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

Transport.prototype._handleMessage = function(data) {
	if (data.messages) {
        for (var i = 0; i < data.messages.length; i++) {
            this._emitter.emit('message', data.messages[i]);
        }
	}
};

Transport.prototype._enqueue = function(message) {
	this.__sendQueue.push(message);
};