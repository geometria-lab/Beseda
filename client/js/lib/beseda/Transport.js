/**
 * @constructor
 */
BesedaPackage.Transport = function(xDomain) {
    this._isXDomain = xDomain;

    this._url          = null;
    this._typeSuffix   = null;
    this._connectionID = null;
    this._emitter      = null;

	this._isConnected  = false;

	this._typeSuffix = null;

    this.__sendQueue = [];
	this.__pendingMessages = {};
};

BesedaPackage.Transport.__transports = {
    'longPolling'      : 'LongPolling',
    'JSONPLongPolling' : 'JSONPLongPolling',
	'webSocket'        : 'WebSocket'
};

BesedaPackage.Transport.getBestTransport = function(options) {
	var TransportClass,
        xDomain = document.location.hostname != options.host ||
                  (document.location.port || (options.ssl ? 443 : 80)) != options.port;

    for(var i = 0; i < options.transports.length; i++) {
	    switch (options.transports[i]) {
		    case 'longPolling':
		        TransportClass = BesedaPackage.transport.LongPolling;
		        break;

		    case 'JSONPLongPolling':
		        TransportClass = BesedaPackage.transport.JSONPLongPolling;
			    break;

		    case 'webSocket':
		        TransportClass = BesedaPackage.transport.WebSocket;
			    break;

		    default:
		         throw Error('Ivalid transport ' + options.transports[i]);
	    }

	    if (TransportClass.isAvailable(options, xDomain)) {
		    break;
	    }
    }

	return new TransportClass(xDomain);
};

BesedaPackage.Transport.prototype.connect = function(host, port, ssl) {
    throw Error('Abstract method calling.');
};

BesedaPackage.Transport.prototype.send = function(messages) {
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

BesedaPackage.Transport.prototype._doSend = function(data) {
	throw Error('Abstract method calling.');
};

BesedaPackage.Transport.prototype.disconnect = function() {
    throw Error('Abstract method calling.');
};

BesedaPackage.Transport.prototype.setEmitter = function(emitter) {
    this._emitter = emitter;
};

BesedaPackage.Transport.prototype._handleConnection = function(id) {
    this._connectionID = id;

    if (this._emitter) {
        this._emitter.emit('connect', this._connectionID);
    }
    
    while(this.__sendQueue.length) {
        this.send(this.__sendQueue.shift());
    }
};

BesedaPackage.Transport.prototype._handleMessages = function(messages) {
	var message;
	while(messages && messages.length) {
		message = messages.shift()

		this._emitter.emit('message', message);

		delete this.__pendingMessages[message.id];
	}
};

BesedaPackage.Transport.prototype._handleError = function(error) {
	var messages = [];
    for (var id in this.__pendingMessages) {
	    messages.push(this.__pendingMessages[id]);

		this._emitter.emit('message:' + id, error);
	}

	if (messages.length) {
		this._enqueue(messages);
	}
	
	this._emitter.emit('error');
	this.__pendingMessages = {};
};

BesedaPackage.Transport.prototype._decodeData = function(data) {
	return JSON.parse(data);
}

BesedaPackage.Transport.prototype._enqueue = function(data) {
    this.__sendQueue.push(data);
};

