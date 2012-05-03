var events = require('events'),
    util   = require('util');

var io = require('./io'),
    router = require('./router'),
    plugins = require('./plugins');

var PluginsManager = require('./../client/js/lib/beseda/plugins/manager.js'),
    RequestStream = require('./request-stream.js');

var Beseda = function() {
	events.EventEmitter.call(this);
    PluginsManager.call(this);

	this.io = new io.IO();

    // Initialize Router
    var route = new router.Route('/', this.__createConnection.bind(this));
    this.router = new router.Router();
    this.router.addRoute(route)
               .get('/:connectionId', this.__handlePollingOutput.bind(this))
               .post('/:connectionId', this.__handlePollingInput.bind(this))
               .delete('/:connectionId', this.__handlePollingDestroy.bind(this));

	this.__handleConnectionData = this.__handleConnectionData.bind(this);
	this.__handleConnectionError = this.__handleConnectionError.bind(this);

	this.__httpServer = null;

    this.callPlugins('createServer', this);
};

util.inherits(plugins, events.EventEmitter);
util.inherits(PluginsManager, plugins);
util.inherits(Beseda, PluginsManager);

Beseda.prototypr.use = function(plugin) {
	if (plugin instanceof http.Server) {
		this.__httpServer = plugin;
	} else {
		PluginsManager.prototype.use(plugin)
	}
}

Beseda.prototype.listen = function() {
    // Initialize HTTP server
    this.__httpServer = this.__httpServer || require('http').createServer();
    this.__httpServerRequestListeners = this.__httpServer.listeners('request');
    this.__httpServer.removeAllListeners('request');
    this.__httpServer.addListener('request', this.__handleRequest.bind(this));
    
    
    this.__httpServer.listen.apply(this.__httpServer, arguments);
};

Beseda.prototype.send = function(id, message) {
	this.io.write(id, message);
};

Beseda.prototype.disconnect = function(id) {
	this.io.destroy(id);
	this.emit('disconnect', id);
};

Beseda.prototype.close = function() {
    this.emit('close');
    this.__httpServer.close();
};

Beseda.prototype.__handleRequest = function(request, response) {
    if (this.router.dispatch(request, response) === false) {
        for (var i = 0; i < this.__httpServerRequestListeners.length; i++) {
            this.__httpServerRequestListeners[i].call(
                this.__httpServer, request, response
            );
        }
    }

	this.emit('request', request, response);
};

Beseda.prototype.__createConnection = function(request, response) {
	var id = this.io.create(this.__getTransport(request));
	this.io.setOutputStream(id, response);
	this.io.setInputStream(id, request);

	this.io.write(id, id);
	this.io.setReadCallback(id, this.__handleConnectionData);
	this.io.setErrorCallback(id, this.__handleConnectionError);

	this.emit('connection', id);
};

Beseda.prototype.__getLongPollingType = function(request) {

};

Beseda.prototype.__handleConnectionData = function(id, data) {
	this.emit('message', id, data);
};

Beseda.prototype.__handleConnectionError = function(id, error) {
	this.emit('error', id, error);
};

Beseda.prototype.__handlePollingOutput = function(request, response, params) {
	this.io.setOutputStream(params.connectionId, response, params);
};

Beseda.prototype.__handlePollingInput = function(request, response, params) {
	request.once('end', response.end.bind(response));
	this.io.setInputStream(params.connectionId, new RequestStream(request));
};

Beseda.prototype.__handlePollingDestroy = function(request, response, params) {
	request.once('end', response.end.bind(response));
	this.io.destroy(params.connectionId);
};

module.exports = Beseda;