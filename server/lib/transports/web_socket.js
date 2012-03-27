var util = require('util');

var Transport = require('./transport.js');
var WebSocketConnection = require('./connections/web_socket.js');

var WebSocketTransport = function(io) {
	Transport.call(this, io);
};

util.inherits(WebSocketTransport, Transport);

WebSocketTransport.prototype._createConnection = function(id) {
	return new WebSocketConnection(id);
};

module.exports = WebSocketTransport;
