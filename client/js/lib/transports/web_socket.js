Beseda.Transport.WebSocket = function() {
	Beseda.Transport.WebSocket._super.constructor.call(this);

	this._typeSuffix = 'webSocket';

	this.__ws = null;
	this.__handshaked = true;

	this.__handleConnectClosure = null;
	this.__handleDataClosure = null;
	this.__handleDisconnectClosure = null;

	this.__initClosuredHandlers();
};

Beseda.Utils.inherits(Beseda.Transport.WebSocket, Beseda.Transport);

Beseda.Transport.WebSocket.isAvailable = function(options) {
	return !!window.WebSocket;
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
	if (!this.__ws) {
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

Beseda.Transport.WebSocket.prototype._doSend = function(data) {
	this.__ws.send(data);
};

Beseda.Transport.WebSocket.prototype.disconnect = function() {
	this._connectionID = null;

	this.__ws.close();
	this.__ws = null;
};

Beseda.Transport.WebSocket.prototype.__handleOpen = function(event) {
	this.__signed = false;
};

Beseda.Transport.WebSocket.prototype.__handleData = function(event) {
	var data = this._decodeData(event.data);

	if (!this.__handshaked) {
		Beseda.Transport.WebSocket._super._handleConnection.call(this, data.connectionId);

		this.__handshaked = true;
	} else {
		Beseda.Transport.WebSocket._super._handleMessages.call(this, data);
	}
};

Beseda.Transport.WebSocket.prototype.__handleClose = function(event) {
	this._handleError(event);
	this.disconnect();
};


