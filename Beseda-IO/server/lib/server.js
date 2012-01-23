var events = require('events');
var http  = require('http');
var util  = require('util');

var io = require('./io');
var RequestStream = require('./request-stream.js');

var Server = function() {
	events.EventEmitter.call(this);

	this.__httpServer = http.createServer();
	this.__httpServer.addListener('request', this.__handleRequest.bind(this));

	this.io = new io.IO();

	this.__handleConnectionData = this.__handleConnectionData.bind(this);
	this.__handleConnectionError = this.__handleConnectionError.bind(this);
};

util.inherits(Server, events.EventEmitter);

Server.prototype.listen = function(port, host) {
	this.__httpServer.listen(port, host);
};

Server.prototype.send = function(id, message) {
	this.io.write(id, message);
};

Server.prototype.destroy = function(id) {
	this.io.destroy(id);
	this.emit('close', id);
};

Server.prototype.__handleRequest = function(request, response) {
	if (request.url === '/') {
		this.__createConnection(request, response);
	} else {
		switch (request.method) {
			case 'GET':
				return this.__handlePollingOutput(request, response);

			case 'POST':
				return this.__handlePollingInput(request, response);

			case 'DELETE':
				return this.__handlePollingDestroy(request, response);
		}
	}

	this.emit('request', request, response);
};

Server.prototype.__createConnection = function(request, response) {
	var id = this.io.create(this.__getLongPollingType(request));
	this.io.setOutputStream(id, response);
	this.io.setInputStream(id, request);

	this.io.write(id, id);
	this.io.setReadCallback(id, this.__handleConnectionData);
	this.io.setErrorCallback(id, this.__handleConnectionError);

	this.emit('open', id);
};

Server.prototype.__getLongPollingType = function(request) {

};

Server.prototype.__getLongPollingID = function(request) {
	return request.url.split('/').pop();
};

Server.prototype.__handleConnectionData = function(id, data) {
	this.emit('message', id, data);
};

Server.prototype.__handleConnectionError = function(id, error) {
	this.emit('error', id, error);
};

Server.prototype.__handlePollingOutput = function(request, response) {
	this.io.setOutputStream(this.__getLongPollingID(request), response);
};

Server.prototype.__handlePollingInput = function(request, response) {
	request.once('end', response.end.bind(response));
	this.io.setInputStream
		(this.__getLongPollingID(request), new RequestStream(request));
};

Server.prototype.__handlePollingDestroy = function(request, response) {
	request.once('end', response.end.bind(response));
	this.io.destroy(this.__getLongPollingID(request));
};

module.exports = Server;