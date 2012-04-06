var util = require('util');

var Connection = require('./connection.js');

var protocolVersions = {
    0  : require('./websocket/v00.js'),
    7  : require('./websocket/v13.js'),
    8  : require('./websocket/v13.js'),
    13 : require('./websocket/v13.js')
};

var WebSocketConnection = function(id) {
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
    if (request.headers.upgrade === undefined || request.headers.upgrade.toLowerCase() !== 'websocket') {
        request.connection.end();
        return this.disconnect();
    }

	this.__protocol = this.__createProtocol(request.headers['sec-websocket-version']);

	this.__protocol.setConnection(this);
	this.__protocol.setStream(request.connection);
	this.__protocol.handshake(request, head);

	this.__protocol.write(JSON.stringify({ 'connectionId' : this._id }));

	return true;
};

WebSocketConnection.prototype.__createProtocol = function(version) {
    var protocol = typeof version !== 'undefined' &&
        protocolVersions[version] !== undefined ? version : 0;

    return new protocolVersions[protocol]();
};

module.exports = WebSocketConnection;