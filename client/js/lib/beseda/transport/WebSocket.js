/**
 * @constructor
 * @extends BesedaPackage.Transport
 */
BesedaPackage.transport.WebSocket = function() {
	BesedaPackage.Transport.prototype.constructor.call(this);

	this._typeSuffix = 'webSocket';

	this.__ws = null;

	this.__handleOpenClosure = null;
	this.__handleDataClosure = null;
	this.__handleCloseClosure = null;

	this.__initClosuredHandlers();
};

BesedaPackage.utils.inherits(BesedaPackage.transport.WebSocket, BesedaPackage.Transport);

BesedaPackage.transport.WebSocket.isAvailable = function(options) {
	return  !!window.WebSocket;
};

BesedaPackage.transport.WebSocket.prototype.__initClosuredHandlers = function() {
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

BesedaPackage.transport.WebSocket.prototype.connect = function(host, port, ssl) {
	if (!this._isConnected) {
		this.__ws = new WebSocket(
			'ws' + (ssl ? 's' : '') + '://' +
			host + (port ? ':' + port : '') +
			'/beseda/io/' + this._typeSuffix + '/' +
			(new Date().getTime())
		);

		this.__ws.addEventListener('open',    this.__handleOpenClosure, false);
		this.__ws.addEventListener('message', this.__handleDataClosure, false);
		this.__ws.addEventListener('error',   this.__handleCloseClosure, false);
		this.__ws.addEventListener('close',   this.__handleCloseClosure, false);
	}
};

BesedaPackage.transport.WebSocket.prototype.disconnect = function() {
	this.__ws['close']();
	this._isConnected = false;
};

BesedaPackage.transport.WebSocket.prototype._doSend = function(data) {
	this.__ws['send'](data);
};

BesedaPackage.transport.WebSocket.prototype.__handleOpen = function(event) {
	this._isConnected = true;
};

BesedaPackage.transport.WebSocket.prototype.__handleData = function(event) {
	/**
	 * @type {{ connectionId: string }}
	 */
	var data = this._decodeData(event.data);

	if (!this.__handshaked) {
		this.__handshaked = true;

		BesedaPackage.Transport.prototype._handleConnection.call(this, data.connectionId);
	} else {
		BesedaPackage.Transport.prototype._handleMessages.call(this, data);
	}
};

BesedaPackage.transport.WebSocket.prototype.__handleClose = function(event) {
	this._handleError(event);
	this.disconnect();
};


