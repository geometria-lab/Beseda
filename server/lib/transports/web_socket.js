var util = require('util');

var Router = require('./../router.js');

module.exports = WebSocketTransport = function(io) {
	process.EventEmitter.call(this);

	this._io = io;
	this._connections = {};

	this._addRoutes();

	this._connectionClass = WebSocketTransport.Connection;

};

util.inherits(WebSocketTransport, process.EventEmitter);

WebSocketTransport.prototype._addRoutes = function() {

};

WebSocketTransport.Connection = function() {

};