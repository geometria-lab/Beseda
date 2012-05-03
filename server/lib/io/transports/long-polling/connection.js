var util = require('util');
var Connection = require('./../connection.js');

var DESTROY_TIMEOUT = 600000;
var HOLD_TIMEOUT = 25000;

var LongPollingConnection = function() {
	Connection.call(this);

	this.__dataQueue = [];
	this.__updateTime = Date.now();

	this.__newOutputStream = null;

	this.__handleReadComplete = this.__handleReadComplete.bind(this);
};

util.inherits(LongPollingConnection, Connection);

LongPollingConnection.prototype.write = function(data) {
	this.__dataQueue.push(data);
};

LongPollingConnection.prototype.setInputStream = function(stream) {
	this._inputStream = stream;

	this._inputStream.addListener('data', this._appendProtocolChunk);
	this._inputStream.addListener('end', this.__handleReadComplete);
	this._inputStream.addListener('error', this._handleError);
	this._inputStream.resume();
};

LongPollingConnection.prototype.__handleReadComplete = function(stream) {
	this._flushProtocol();

	this._inputStream.removeListener('data', this._appendProtocolChunk);
	this._inputStream.removeListener('end', this.__handleReadComplete);
	this._inputStream.removeListener('error', this._handleError);
	this._inputStream = null;
};

LongPollingConnection.prototype.setOutputStream = function(stream) {
	if (this._outputStream !== null) {
		this.__newOutputStream = stream;
		this._io.flush(this.id);
	} else {
		this.__applyOutputStream(stream);
	}

	this.__updateTime = Date.now();
};

LongPollingConnection.prototype.__applyOutputStream = function(stream) {
	this._outputStream = stream;
	this._outputStream.addListener('error', this._handleError);
};

LongPollingConnection.prototype.destroy = function() {
	if (this._outputStream !== null) {
		this._outputStream.destroy();
		this._outputStream = null;
	}

	this.__dataQueue.length = 0;
};

LongPollingConnection.prototype.process = function() {
	var lifeTime = Date.now() - this.__updateTime;
	if (lifeTime > DESTROY_TIMEOUT) {
		this._io.destroy(this.id);
	} else if (this._outputStream !== null &&
			  (this.__dataQueue.length > 0 || lifeTime > HOLD_TIMEOUT)) {
		this._io.flush(this.id);
	}
};

LongPollingConnection.prototype.flush = function() {
	this._outputStream.write(this._protocol.encodeData(this.__dataQueue))

	this._outputStream.end();
	this._outputStream = null;

	this.__dataQueue.length = 0;

	if (this.__newOutputStream !== null) {
		this.__applyOutputStream(this.__newOutputStream);
		this.__newOutputStream = null;
	}
};

module.exports = LongPollingConnection;