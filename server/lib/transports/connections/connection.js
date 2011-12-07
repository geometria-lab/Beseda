var util = require('util');

var Connection = function(id) {
	this._id = id;
	this._transport = null;
};

Connection.prototype.apply = function(request, response, head) {};

Connection.prototype.write = function(data) {};

Connection.prototype.disconnect = function() {
	this._transport.destroyConnection(this._id);
};

Connection.prototype.setTransport = function(transport) {
	this._transport = transport;
};

Connection.prototype.handleData = function(data) {
	if (this._transport !== null) {
		var message = null;

		try { message = JSON.parse(data); } catch (error) {}

		if (message !== null) {
			this._transport.emit('message', this._id, message);
		}
	}
};

module.exports = Connection;