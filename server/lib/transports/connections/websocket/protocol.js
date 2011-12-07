var Protocol = function() {
	this._stream = null;
	this._connection = null;
};

Protocol.prototype.setStream = function(stream) {
	this._stream = stream;
};

Protocol.prototype.setConnection = function(connection) {
	this._connection = connection;
};

Protocol.prototype.handshake = function(headers, request, head) {};

Protocol.prototype.write = function(data) {
	try {
		this._stream.write(this._frame(data));
	} catch (error) {
		this._connection.disconnect();
	}
};

Protocol.prototype._frame = function(data) {};

Protocol.prototype._collectData = function(data) {};

Protocol.prototype._initListeners = function() {
	this._stream.on('data', this._collectData.bind(this));
	this._stream.on('end', this._connection.disconnect.bind(this._connection));
};

module.exports = Protocol;