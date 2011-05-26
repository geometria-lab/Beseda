Beseda.Transport = function() {
    this._url          = null;
    this._typeSuffix   = null;
    this._connectionID = null;
    this._emitter      = null;

	this._isConnected  = false;

	this._typeSuffix = null;

    this.__sendQueue = [];
	this.__pendingMessages = {};
};

Beseda.Transport._transports = {
    'longPolling'      : 'LongPolling',
    'JSONPLongPolling' : 'JSONPLongPolling',
	'webSocket'        : 'WebSocket'
};

Beseda.Transport.getBestTransport = function(options) {
    for(var i = 0; i < options.transports.length; i++) {

        var transportName = Beseda.Transport._transports[options.transports[i]];
        var transport = Beseda.Transport[transportName];
        
        if (transport) {
            if (transport.isAvailable(options)) {
                return new transport();
            }
        } else {
            throw Error('Ivalid transport ' + options.transports[i]);
        }
    }
};

Beseda.Transport.prototype.connect = function(host, port, ssl) {
    throw Error('Abstract method calling.');
};

/**
 *
 * @param Array.<{ id: string }> messages
 */
Beseda.Transport.prototype.send = function(messages) {
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

Beseda.Transport.prototype._doSend = function(data) {
	throw Error('Abstract method calling.');
};

Beseda.Transport.prototype.disconnect = function() {
    throw Error('Abstract method calling.');
};

Beseda.Transport.prototype.setEmitter = function(emitter) {
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

Beseda.Transport.prototype._handleMessages = function(messages) {
	var message;
	while(messages && messages.length) {
		message = messages.shift()

		this._emitter.emit('message', message);

		delete this.__pendingMessages[message.id];
	}
};

Beseda.Transport.prototype._handleError = function(error) {
    for (var id in this.__pendingMessages) {
		 this._emitter.emit('message:' + id, error);
	}
	this._emitter.emit('error');

	this.__pendingMessages = {};
};

Beseda.Transport.prototype._decodeData = function(data) {
	return JSON.parse(data);
}

Beseda.Transport.prototype._enqueue = function(data) {
    this.__sendQueue.push(data);
};

