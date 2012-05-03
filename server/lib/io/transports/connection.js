var ID_PREFIX = 'beseda_';
var LAST_ID = 0;

var Connection = function() {
	this.id = ID_PREFIX + ++LAST_ID;
	this._io = null;

	this._outputStream = null;
	this._inputStream = null;

	this._protocol = null;
	this._readCallback = null;
	this._errorCallback = null;

	this._handleError = this._handleError.bind(this);
};

Connection.prototype.setIO = function(io) {
	return this._io = io;
};

Connection.prototype.destroy = function() {};

Connection.prototype.setInputStream = function(stream) {};
Connection.prototype.setOutputStream = function(stream) {};

Connection.prototype.write = function(data) {};

Connection.prototype.setProtocol = function(protocol) {
	this._protocol = protocol;

	this._appendProtocolChunk
		= this._protocol.appendChunk.bind(this._protocol);
};

Connection.prototype.setReadCallback = function(callback) {
	this._readCallback = callback;
};

Connection.prototype.setErrorCallback = function(callback) {
	this._errorCallback = callback;
};

Connection.prototype._flushProtocol = function() {
	var data = this._protocol.flush();
	if (data !== null && this._readCallback !== null) {
		this._readCallback(this.id, data);
	}
};

Connection.prototype._handleError = function(error) {
	if (this._errorCallback !== null) {
		this._errorCallback(this.id, error);
	} else {
		this._io.destroy(this.id);
	}
};

module.exports = Connection;