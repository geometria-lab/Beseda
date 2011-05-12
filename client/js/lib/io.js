var IO = function(host, port) {
	this.__host = host;
	this.__port = port;

	this.__transport = null;
	this.__emitter = null;
};

IO.EVENT_CONNECT 	= 'io_connect';
IO.EVENT_MESSAGE 	= 'io_message';
IO.EVENT_DISCONNECT = 'io_disconnect';
IO.EVENT_ERROR 	    = 'io_error';

IO.prototype.setTransport = function(transport) {
	this.__transport = transport;

	if (this.__emitter) {
		this.__transport.setEmitter(this.__emitter);
	}
};

IO.prototype.setEmitter = function(emitter) {
	if (this.__transport) {
		this.__transport.setEmitter(emitter);
	} else {
		this.__emitter = emitter;
	}
};

IO.prototype.connect = function() {
	this.__transport.connect(this.__host, this.__port);
};

IO.prototype.send = function(data) {
	this.__transport.send(data);
};

IO.prototype.disconnect = function() {
	this.__transport.disconnect();
};
