Beseda.Transport.WebSocket = function() {
	Beseda.Transport.WebSocket._super.constructor.call(this);

	this._typeSuffix = 'webSocket';

	this.__ws = null;

	this.__handleOpenClosure = null;
	this.__handleDataClosure = null;
	this.__handleCloseClosure = null;

	this.__initClosuredHandlers();
};

Beseda.Utils.inherits(Beseda.Transport.WebSocket, Beseda.Transport);

Beseda.Transport.WebSocket.isAvailable = function(options) {
	return !window.WebSocket;
};

Beseda.Transport.WebSocket.prototype.__initClosuredHandlers = function() {
	var self = this;

	this.__handleOpenClosure = function(event) {
		self.__handleOpen(event);
	};

	this.__handleDataClosure = function(event) {
		self.__handleData(event);
	};

	this.__handleCloseClosure = function(event) {
		self.__handleClose(event);
	};
};

Beseda.Transport.WebSocket.prototype.connect = function(host, port, ssl) {
	if (!this._isConnected) {
		this.__ws = new WebSocket(
			'ws' + (ssl ? 's' : '') + '://' +
			host + (port ? ':' + port : '') +
			'/beseda/io/' + this._typeSuffix + '/' +
			(new Date().getTime())
		);

		this.__ws.addEventListener('open',    this.__handleOpenClosure);
		this.__ws.addEventListener('message', this.__handleDataClosure);
		this.__ws.addEventListener('error',   this.__handleCloseClosure);
		this.__ws.addEventListener('close',   this.__handleCloseClosure);
	}
};

Beseda.Transport.WebSocket.prototype.disconnect = function() {
	this.__ws.close();
	this._isConnected = false;
};

Beseda.Transport.WebSocket.prototype._doSend = function(data) {
	this.__ws.send(data);
};

Beseda.Transport.WebSocket.prototype.__handleOpen = function(event) {
	this._isConnected = true;
};

Beseda.Transport.WebSocket.prototype.__handleData = function(event) {
	var data = this._decodeData(event.data);

	if (!this.__handshaked) {
		this.__handshaked = true;

		Beseda.Transport.WebSocket._super._handleConnection.call(this, data.connectionId);
	} else {
		Beseda.Transport.WebSocket._super._handleMessages.call(this, data);
	}
};

Beseda.Transport.WebSocket.prototype.__handleClose = function(event) {
	this._handleError(event);
	this.disconnect();
};


