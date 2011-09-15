try {
	var WebSocket = require('websocket-client').WebSocket;
} catch (e) {
	throw new Error("'websocket-client' package required.");
}
var Transport = require('./../transport.js');

var util = require('util');

var WebSocketTransport = module.exports = function() {
	Transport.prototype.constructor.call(this);

	this._typeSuffix = 'webSocket';

	this.__ws = null;

	this.__handleOpenClosure = this._handleOpen.bind(this);
	this.__handleDataClosure = this._handleData.bind(this);
	this.__handleCloseClosure = this._handleError.bind(this);

};

util.inherits(WebSocketTransport, Transport);

WebSocketTransport.prototype.connect = function(host, port, ssl) {
	if (!this._isConnected) {
		this.__ws = new WebSocket(
			'ws' + (ssl ? 's' : '') + '://' +
			host + (port ? ':' + port : '') +
			'/beseda/io/' + this._typeSuffix + '/' +
			(new Date().getTime())
		);

		this.__ws.addListener('open',    this.__handleOpenClosure);
		this.__ws.addListener('message', this.__handleDataClosure);
		this.__ws.addListener('error',   this.__handleCloseClosure);
		this.__ws.addListener('close',   this.__handleCloseClosure);
	}
};

WebSocketTransport.prototype.disconnect = function() {
	this.__ws.close();
	this._isConnected = false;
};

WebSocketTransport.prototype._doSend = function(data) {
	this.__ws.send(data);
};

WebSocketTransport.prototype._handleOpen = function(event) {
	this._isConnected = true;
};

WebSocketTransport.prototype._handleData = function(data) {
	var data = this._decodeData(data);

	if (!this.__handshaked) {
		this.__handshaked = true;
		
		Transport.prototype._handleConnection.call(this, data.connectionId);
	} else {
		Transport.prototype._handleMessages.call(this, data);
	}
};

WebSocketTransport.prototype.__handleClose = function(event) {
	this._handleError(event);
	this.disconnect();
};


