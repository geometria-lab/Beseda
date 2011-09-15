var util = require('util');

var Router = require('./../router.js');

module.exports = LongPollingTransport = function(io) {
    this.io = io;
    this._connections = {};
	this._zombies = [];

    this._addRoutes();

	this._connectionClass = LongPollingTransport.Connection;
	this.__destroyNextTick = this.__destroyNextTick.bind(this);
	this.__flushConnections = this.__flushConnections.bind(this);

	this.__isRunning = true;

	setTimeout(this.__flushConnections, LongPollingTransport.CHECK_INTERVAL);
};

LongPollingTransport.CHECK_INTERVAL = 100;
LongPollingTransport.ERROR_INVALID_CONNECTION_ID = new Buffer('{ "error" : "Invalid connection id" }');
LongPollingTransport.ERROR_INVALID_CONNECTION_ID_RES = new Buffer('{ "error" : "Invalid connection id res" }');

LongPollingTransport.parseMessages = function(data) {
	try {
		return JSON.parse(data);
	} catch (e) {
		return [];
	}
};

LongPollingTransport.prototype.createConnection = function(connectionId, request, response) {
    this._connections[connectionId] = new this._connectionClass(this, connectionId);
	this._connections[connectionId].apply(response);

	if (!this.__isRunning) {
		this.__isRunning = true;
		
		setTimeout(this.__flushConnections, LongPollingTransport.CHECK_INTERVAL);
	}
	
	return this._connections[connectionId];
};

LongPollingTransport.prototype._addRoutes = function() {
	this.io.server.router.addRoute(new Router.Route(
		'/beseda/io/longPolling/:id/:time', this._receive.bind(this), { method : ['PUT'] }
	));
	
	this.io.server.router.addRoute(new Router.Route(
		'/beseda/io/longPolling/:id/:time', this._disconnect.bind(this), { method : ['DELETE'] }
	));
	
	this.io.server.router.addRoute(new Router.Route(
		'/beseda/io/longPolling/:id/:time', this._holdRequest.bind(this), { method : ['GET'] }
	));
};

LongPollingTransport.prototype._holdRequest = function(request, response, params) {
    if (this._connections[params.id] === undefined) {
        return Router.Utils.sendJSON(response, LongPollingTransport.ERROR_INVALID_CONNECTION_ID, 404);
    }

    this._connections[params.id].hold(request, response, params);
};

LongPollingTransport.prototype._disconnect = function(request, response, params) {
	this.destroy(params.id);
	
	Router.Utils.send(response, 200);
};

LongPollingTransport.prototype.__destroyNextTick = function() {
	this.io.emit('disconnect', this._zombies);
	this._zombies = [];
};

LongPollingTransport.prototype.destroy = function(id) {
	this._zombies.push(id);
	
	delete this._connections[id];

	process.nextTick(this.__destroyNextTick);
};

LongPollingTransport.prototype._receive = function(request, response, params) {
    if (this._connections[params.id] === undefined) {
        return Router.Utils.sendJSON
	        (response, LongPollingTransport.ERROR_INVALID_CONNECTION_ID_RES, 404);
    }

    this._connections[params.id].receive(request, response, params);
};

LongPollingTransport.prototype.__flushConnections = function() {
	var i = 0,
		t = Date.now();

	for (var id in this._connections) {
		this._connections[id].waitOrFlush();
		
		i++;
	}

	if (i !== 0) {
		var checkInterval = Math.ceil(Math.sqrt(i) * 2.5) + Date.now() - t;
		console.log(checkInterval);
		
		setTimeout(this.__flushConnections, checkInterval);
	} else {
		this.__isRunning = false;
	}
};

//////////////////////////////////////////////////////////////////////////////

LongPollingTransport.Connection = function(transport, id) {
    this.transport = transport;
    this.id = id;

	this._updateFlag  = 0;
	this._currentFlag = 0;
	this._updateTime  = Date.now();

	this._dataQueue = [];
	this._response  = null;

	this._flush = this._flush.bind(this);
};

LongPollingTransport.Connection.prototype.apply = function(response) {
	Router.Utils.sendJSON(response, '{ "connectionId" : "' + this.id + '" }');
};

LongPollingTransport.Connection.prototype.send = function(data) {
    this._dataQueue.push(data);
	this._updateFlag++;
};

LongPollingTransport.Connection.prototype.hold = function(request, response, params) {
    if (this._response !== null) {
	    process.nextTick(this._flush);
    }

    this._response    = response;
    this._currentFlag = this._updateFlag;
    this._updateTime  = Date.now();
}

LongPollingTransport.Connection.prototype.receive = function(request, response, params) {
	var self = this;
	var data = '';

	request.on('data', function(chunk) {
		data += chunk;
	});

	request.on('end', function() {
		Router.Utils.send(response, 200);

		request.removeAllListeners('data');
		request.removeAllListeners('end');

		self.transport.io.emit('messages', self.id, LongPollingTransport.parseMessages(data));
	});
};

LongPollingTransport.Connection.prototype.waitOrFlush = function() {
	var lifeTime = Date.now() - this._updateTime;

	if (lifeTime > 600000) {
		this.transport.destroy(this.id)
	} else if (this._response !== null) {
		if (lifeTime > 25000 ||
			this._dataQueue.length > 0 ||
			this._currentFlag !== this._updateFlag) {

			process.nextTick(this._flush);
		}
	}
};

LongPollingTransport.Connection.prototype._flush = function() {
	Router.Utils.sendJSON(this._response, JSON.stringify(this._dataQueue));
	
	this._dataQueue = [];
	this._response = null;
};