Beseda.IO = function(host, port) {
	this.__host = host;
	this.__port = port;

	this.__transport = null;
	this.__emitter = null;
};

Beseda.IO.EVENT_CONNECT 	= 'io_connect';
Beseda.IO.EVENT_MESSAGE 	= 'io_message';
Beseda.IO.EVENT_DISCONNECT = 'io_disconnect';
Beseda.IO.EVENT_ERROR 	    = 'io_error';

Beseda.IO.prototype.setTransport = function(transport) {
	this.__transport = transport;

	if (this.__emitter) {
		this.__transport.setEmitter(this.__emitter);
	}
};

Beseda.IO.prototype.setEmitter = function(emitter) {
	if (this.__transport) {
		this.__transport.setEmitter(emitter);
	} else {
		this.__emitter = emitter;
	}
};

Beseda.IO.prototype.connect = function() {
	this.__transport.connect(this.__host, this.__port);
};

Beseda.IO.prototype.send = function(data) {
	this.__transport.send(data);
};

Beseda.IO.prototype.disconnect = function() {
	this.__transport.disconnect();
};
