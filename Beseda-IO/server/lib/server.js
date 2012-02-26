var events = require('events'),
    util   = require('util');

var io = require('./io');
var router = require('./router');

var RequestStream = require('./request-stream.js');

var Server = function(beseda, server) {
	events.EventEmitter.call(this);

    this.beseda = beseda;

    // Initialize HTTP server
    this.__httpServer = server || this.__createDefaultHttpServer();
    this.__httpServerRequestListeners = this.__httpServer.listeners('request');
    this.__httpServer.removeAllListeners('request');
    this.__httpServer.addListener('request', this.__handleRequest.bind(this));

	this.io = new io.IO();

    // Initialize Router
    var route = new router.Route('/', this.__createConnection.bind(this));
    this.router = new router.Router();
    this.router.addRoute(route)
               .get('/:transport', this.__handlePollingOutput.bind(this))
               .post('/:transport', this.__handlePollingInput.bind(this))
               .delete('/:transport', this.__handlePollingDestroy.bind(this));

	this.__handleConnectionData = this.__handleConnectionData.bind(this);
	this.__handleConnectionError = this.__handleConnectionError.bind(this);
    
    this.beseda.callPlugins('createServer', this);
};

util.inherits(Server, events.EventEmitter);

Server.prototype.listen = function() {
    this.__httpServer.listen.apply(this.__httpServer, arguments);
};

Server.prototype.send = function(id, message) {
	this.io.write(id, message);
};

Server.prototype.disconnect = function(id) {
	this.io.destroy(id);
	this.emit('disconnect', id);
};

Server.prototype.close = function() {
    this.emit('close');
    this.__httpServer.close();
};

Server.prototype.__handleRequest = function(request, response) {
    for (var i = 0; i < this.__httpServerRequestListeners.length; i++) {
        this.__httpServerRequestListeners[i].call(
            this.__httpServer,
            request,
            response
        );
    }

	this.emit('request', request, response);
};

Server.prototype.__createDefaultHttpServer = function() {
    return this.beseda.callFirstPlugin('createDefaultHttpServer') ||
           require('http').createServer();
}

Server.prototype.__createConnection = function(request, response) {
	var id = this.io.create(this.__getLongPollingType(request));
	this.io.setOutputStream(id, response);
	this.io.setInputStream(id, request);

	this.io.write(id, id);
	this.io.setReadCallback(id, this.__handleConnectionData);
	this.io.setErrorCallback(id, this.__handleConnectionError);

	this.emit('connection', id);
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