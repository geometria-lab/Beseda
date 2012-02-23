var events = require('events');
var http  = require('http');
var util  = require('util');

var io = require('./io');
var router = require('./router');

var Static = require('./static.js');
var RequestStream = require('./request-stream.js');

var Server = function() {
	events.EventEmitter.call(this);

	this.io = new io.IO();

    this.router = new router.Router();

    this.__static = new Static();
    this.router.get('/beseda/js/:filename', this.__handleStaticFile.bind(this));

	this.__handleConnectionData = this.__handleConnectionData.bind(this);
	this.__handleConnectionError = this.__handleConnectionError.bind(this);

    this.__httpServer = null;
};

util.inherits(Server, events.EventEmitter);

Server.prototype.listen = function(port, host) {
    if ('undefined' == typeof port) {
        port = 80;
    }

    if ('number' == typeof port) {
        this.__httpServer = http.createServer();
        this.__httpServer.listen(port, host);
    }

    this.__httpServerRequestListeners = this.__httpServer.listeners('request');
    this.__httpServer.removeAllListeners('request');

	this.__httpServer.addListener('request', this.__handleRequest.bind(this));
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

    for (var i = 0; i < this.__httpServerRequestListeners.length; i++) {
        this.__httpServerRequestListeners[i].call(
            this.__httpServer,
            request,
            response
        );
    }

	this.emit('request', request, response);
};

Server.prototype.__handleStaticFile = function(request, response, params) {
    var file = __dirname + '/../../client/js/' + params.filename;

    this.__static.process(
        request,
        response,
        file,
        'text/javascript',
        this.__handleStaticFileError.bind(this)
    );
}

Server.prototype.__handleStaticFileError = function(error, request, response, filePath) {
    if (error) {
        util.log('Can\'t send file "' + request.url + ' (' + filePath +')": ' + error);

        router.utils.send(response, 404);
    }
};

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