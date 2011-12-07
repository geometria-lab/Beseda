var util = require('util');

var Connection = require('./connection.js');
var Draft00 = require('./websocket/draft_00.js');
var Draft07 = require('./websocket/draft_17.js');

var WebSocketConnection = function(id) {
	console.log(1);
	Connection.call(this, id);
	this.__protocol = null;
};

util.inherits(WebSocketConnection, Connection);

WebSocketConnection.prototype.disconnect = function() {
	this._transport.destroyConnection(this._id);
};

WebSocketConnection.prototype.write = function(data) {
	if (this.__protocol !== null && data !== undefined) {
		this.__protocol.write(JSON.stringify([data]));
	}
};

WebSocketConnection.prototype.apply = function(request, response, head) {
	console.log(2);

	this.__protocol
		= this.__createProtocol(request.headers['sec-websocket-version']);

	this.__protocol.setConnection(this);
	this.__protocol.setStream(request.connection);
	this.__protocol.handshake(request.headers, request, head);

	this.__protocol.write(JSON.stringify({ 'connectionId' : this._id }));

	return true;
};

WebSocketConnection.prototype.__createProtocol = function(version) {
	switch (version) {
		case '8': return new Draft07();
		default: return new Draft00();
	}
};

module.exports = WebSocketConnection;