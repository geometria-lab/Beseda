var util = require('util');

var Transport = function(io) {
	process.EventEmitter.call(this);

	this._io = null;
	this._connections = {};

	if (io !== undefined) {
		this._io = io;
	}
};

util.inherits(Transport, process.EventEmitter);

Transport.prototype.registerConnection = function(id, request, response, head) {
	var connection = this._createConnection(id);
	connection.setTransport(this);

	if (connection !== null) {
		connection.apply(request, response, head);

		this._connections[id] = connection;
		this._start();

		return connection;
	}

	return null;
};

Transport.prototype._start = function() {};

Transport.prototype._createConnection = function(id) {};

Transport.prototype.destroyConnection = function(id) {
	delete this._connections[id];
};

module.exports = Transport
