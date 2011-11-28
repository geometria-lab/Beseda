var util = require('util');

var Router = require('./../router.js');
var Transport = require('./transport.js');
var LongPollingConnection = require('./connections/long_polling.js');

var INVALID_CONNECTION_ID = new Buffer('{ "error" : "Invalid connection id" }');

var CHECK_INTERVAL = 100;

var LongPollingTransport = function(io) {
	Transport.call(this, io);

	this._zombies = [];
	this.__isRunning = false;

	this._initRoutes();

	this._flushConnections = this._flushConnections.bind(this);
	this.__destroyNextTick = this.__destroyNextTick.bind(this);
};

util.inherits(LongPollingTransport, Transport);

LongPollingTransport.prototype._start = function(id) {
	if (!this.__isRunning) {
		this.__isRunning = true;
		setTimeout(this._flushConnections, CHECK_INTERVAL);
	}
};

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

LongPollingTransport.prototype.destroyConnection = function(id) {
	this._zombies.push(id);

	delete this._connections[id];
	
	process.nextTick(this.__destroyNextTick);
};

LongPollingTransport.prototype.__destroyNextTick = function() {
	for (var i in this._zombies) {
		this.emit('disconnect', this._zombies[i]);
	}

	this._zombies = [];
};

LongPollingTransport.prototype._destroy = function(request, response, params) {
	this.destroyConnection(params.id);
	
	Router.Utils.sendJSON(response, '', 200);
};

LongPollingTransport.prototype._holdRequest
	= function(request, response, params) {

    if (this._connections[params.id] === undefined) {
        Router.Utils.sendJSON(response, INVALID_CONNECTION_ID, 404);
    } else {
	    this._connections[params.id].hold(request, response, params);
    }
};

LongPollingTransport.prototype._flushConnections = function() {
	var i = 0,
		t = Date.now();

	for (var id in this._connections) {
		this._connections[id].waitOrFlush();
		i++;
	}

	this.__isRunning = i !== 0;
	if (this.__isRunning) {
		setTimeout(
			this._flushConnections,
			Math.ceil(Math.sqrt(i) * 2.5) + Date.now() - t
		);
	};
};

module.exports = LongPollingTransport;
