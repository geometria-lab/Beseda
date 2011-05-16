Beseda.Transport = function() {
	this._url          = null;
	this._typeSuffix   = null;
	this._connectionID = null;
	this._emitter      = null;

	this.__sendQueue = [];
};

Beseda.Transport.DATA_SEPARATOR	 = '|';

Beseda.Transport._transports = {
	'longPolling'      : 'LongPolling',
	'JSONPLongPolling' : 'JSONPLongPolling'
};

Beseda.Transport.getBestTransport = function(options) {
	for(var i = 0; i < options.transports.length; i++) {

		var transportName = Beseda.Transport._transports[options.transports[i]]
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

Beseda.Transport.prototype.send = function(data) {
	throw Error('Abstract method calling.');
};

Beseda.Transport.prototype.disconnect = function() {
	throw Error('Abstract method calling.');
};

Beseda.Transport.prototype.setEmitter = function(emitter) {
	this._emitter = emitter;
};

Beseda.Transport.prototype._handleConnection = function(data) {
	this._connectionID = data;

	if (this._emitter) {
		this._emitter.emit('connect', this._connectionID);
	}
	
	while(this.__sendQueue.length) {
		this.send(this.__sendQueue.shift());
	}
};

Beseda.Transport.prototype._handleMessage = function(data) {
	if (data && data.length > 0) {
		var parsedData = data.split(Beseda.Transport.DATA_SEPARATOR);
		
		while(parsedData.length) {
			this._emitter.emit('message', parsedData.shift());
		}
	}
};

Beseda.Transport.prototype._enqueue = function(data) {
	this.__sendQueue.push(data);
};

