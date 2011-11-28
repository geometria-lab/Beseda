var util = require('util');

var Connection = function(id) {
	this._id = id;
	this._transport = null;
};

Connection.prototype.apply = function(request, response, head) {};

Connection.prototype.write = function(data) {};

Connection.prototype.setTransport = function(transport) {
	this._transport = transport;
};

Connection.prototype.handleData = function(data) {
	if (this._transport !== null) {
		this._transport.emit('message', this._id, JSON.parse(data));
	}
};

module.exports = Connection;