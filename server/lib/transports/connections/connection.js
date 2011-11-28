var util = require('util');

var Connection = function(id) {
	this._id = null;
	this._transport = null;

	if (id !== undefined) {
		this._id = id;
	}
};

Connection.prototype.setTransport = function(transport) {
	this._transport = transport;
};

Connection.prototype.apply = function(request, response, head) {};

Connection.prototype.write = function(data) {};

Connection.prototype.handleData = function(data) {
	if (this._transport !== null) {
		this._transport.emit('message', this._id, JSON.parse(data));
	}
};

Connection.prototype.disconnect = function() {
	this._transport.removeConnection(this._id);
	this._transport.emit('disconnect', this._id);
};

module.exports = Connection;