var util = require('util');

var Router = require('./../router.js');
var Transport = require('./transport.js');
var LongPollingConnection = require('./connections/long_polling.js');

var INVALID_CONNECTION_ID = new Buffer('{ "error" : "Invalid connection id" }');

var CHECK_INTERVAL = 100;

var LongPollingTransport = function(io) {
	Transport.call(this, io);

	this._initRoutes();
	this._initConnectionsLoop();
};

util.inherits(LongPollingTransport, Transport);

LongPollingTransport.prototype._createConnection = function(id) {
	return new LongPollingConnection(id);
};

LongPollingTransport.prototype._initRoutes = function() {
	this._io.server.router.addRoute(new Router.Route(
		'/beseda/io/longPolling/:id/:time', this._receive.bind(this),
		{ method : [ 'PUT' ] }
	));

	this._io.server.router.addRoute(new Router.Route(
		'/beseda/io/longPolling/:id/:time', this._destroy.bind(this),
		{ method : [ 'DELETE' ] }
	));

	this._io.server.router.addRoute(new Router.Route(
		'/beseda/io/longPolling/:id/:time', this._holdRequest.bind(this),
		{ method : [ 'GET' ] }
	));
};

LongPollingTransport.prototype._receive = function(request, response, params) {
    if (this._connections[params.id] === undefined) {
        Router.Utils.sendJSON(response, INVALID_CONNECTION_ID, 404);
    } else {
	    this._connections[params.id].receive(request, response, params);
    }
};

LongPollingTransport.prototype._destroy = function(request, response, params) {
	Router.Utils.sendJSON(response, '', 200);
	this.removeConnection(params.id);
	this.emit('disconnect', params.id);
};

LongPollingTransport.prototype._holdRequest
	= function(request, response, params) {

    if (this._connections[params.id] === undefined) {
        Router.Utils.sendJSON(response, INVALID_CONNECTION_ID, 404);
    } else {
	    this._connections[params.id].hold(request, response, params);
    }
};

LongPollingTransport.prototype._initConnectionsLoop = function() {
	setInterval(this._flushConnections.bind(this), CHECK_INTERVAL);
};

LongPollingTransport.prototype._flushConnections = function() {
	for (var id in this._connections) {
		this._connections[id].waitOrFlush();
	}
};

module.exports = LongPollingTransport;
