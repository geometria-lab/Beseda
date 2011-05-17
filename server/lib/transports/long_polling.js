var util = require('util');

var Router = require('./../router.js');

// TODO: Implement disconnect

module.exports = LongPollingTransport = function(io) {
	process.EventEmitter.call(this);

    this.io = io;
    this._connections = {};

    this._addRoutes();

	this._connection = LongPollingTransport.Connection;

    this._flushInterval = setInterval(this._flushConnections.bind(this),
                                      LongPollingTransport.CHECK_INTERVAL);
}

util.inherits(LongPollingTransport, process.EventEmitter);

LongPollingTransport.CHECK_INTERVAL = 1000;
LongPollingTransport.MAX_LOOP_COUNT = 10;

LongPollingTransport.parseMessages = function(response, data) {
	try {
		var messages = JSON.parse(data)
	} catch (e) {
		return this._sendInvalidMessages(response);
	}

	if (!Array.isArray(messages)) {
		return this._sendInvalidMessages(response);
	}

	return messages;
}

LongPollingTransport._sendInvalidMessages = function(response) {
	Router.Utils.sendJSON(response, {
		error : 'Invalid messages format'
	}, 400);

	return false;
}

LongPollingTransport.prototype.createConnection = function(connectionId, request, response) {
	this._sendApplyConnection(connectionId, request, response);

    this._connections[connectionId] = new this._connection(this, connectionId);

    return this._connections[connectionId];
}

LongPollingTransport.prototype._addRoutes = function() {
	this.io.server.router.get('/beseda/io/longPolling/:id', this._holdRequest.bind(this));
    this.io.server.router.post('/beseda/io/longPolling/:id', this._receive.bind(this));
}

LongPollingTransport.prototype._sendApplyConnection = function(connectionId, request, response) {
	Router.Utils.sendJSON(response, { connectionId : connectionId });
}

LongPollingTransport.prototype._holdRequest = function(request, response, params) {
    if (!this._connections[params.id]) {
        return Router.Utils.sendJSON(response, {
            error : 'Invalid connection id'
        }, 404);
    }

    this._connections[params.id].hold(request, response, params);
}

LongPollingTransport.prototype._receive = function(request, response, params) {
    if (!this._connections[params.id]) {
        return Router.Utils.sendJSON(response, {
            error : 'Invalid connection id'
        }, 404);
    }

    this._connections[params.id].receive(request, response, params);
}

LongPollingTransport.prototype._flushConnections = function() {
	for (var id in this._connections) {
		this._connections[id].waitOrFlush();
	}
}

LongPollingTransport.prototype.removeConnection = function(id) {
	delete this._connections[id];
}

LongPollingTransport.Connection = function(transport, id) {
    this.transport = transport;
    this.id = id;

    this._receivers = {};
    this._lastReceiverId = 0;

	this._updateFlag  = 0;
	this._currentFlag = 0;
	this._loopCount   = LongPollingTransport.MAX_LOOP_COUNT;

	this._dataQueue = [];
	this._response  = null;

	this.__disconnectTimeout = null;
	
};

LongPollingTransport.Connection.prototype.send = function(data) {
    this._dataQueue.push(data);
	++this._updateFlag;
}

LongPollingTransport.Connection.prototype.hold = function(request, response, params) {
    if (this._response !== null) {
        this._flush();
    }

    this._response    = response;
    this._currentFlag = this._updateFlag;
    this._loopCount   = LongPollingTransport.MAX_LOOP_COUNT;

	if (this.__disconnectTimeout) {
		clearTimeout(this.__disconnectTimeout);
	}

    this.__disconnectTimeout = setTimeout(this.disconnect.bind(this), 20000);
}

LongPollingTransport.Connection.prototype.disconnect = function() {
	util.debug('disconnect ' + this.id);
	
	this.transport.emit('disconnect', this.id);
	this.transport.removeConnection(this.id);
};

LongPollingTransport.Connection.prototype.receive = function(request, response, params) {
    var id = ++this._lastReceiverId;

    this._receivers[id] = new LongPollingTransport.Connection.Receiver(this, id, request, response);
}

LongPollingTransport.Connection.prototype.waitOrFlush = function() {
    if (this._response) {
        if (this._loopCount <= 0 ||
            this._dataQueue.length > 0 ||
            this._currentFlag !== this._updateFlag) {
            this._flush();
        } else {
            this._loopCount--;
        }
    }
}

LongPollingTransport.Connection.prototype.deleteReceiver = function(receiverId) {
	delete this._receivers[receiverId];
}

LongPollingTransport.Connection.prototype._flush = function() {
    Router.Utils.sendJSON(this._response, {
        messages : this._dataQueue
    });

	this._dataQueue = [];
	this._response = null;
}

LongPollingTransport.Connection.Receiver = function(connection, id, request, response) {
    this._connection = connection;
    this._id = id;
    this._data = '';

    this._request = request;
    this._response = response;

    this._request.on('data', this._collectData.bind(this));
	this._request.on('end', this._end.bind(this));
}

LongPollingTransport.Connection.Receiver.prototype._collectData = function(chunk) {
    this._data += chunk;
}

LongPollingTransport.Connection.Receiver.prototype._end = function() {
    Router.Utils.send(this._response, 200);

	this._request.removeListener('data', this._collectData.bind(this));
	this._request.removeListener('end', this._end.bind(this));

	this._connection.deleteReceiver(this._id);

	var messages = LongPollingTransport.parseMessages(this._response, this._data);

	if (messages) {
		this._connection.transport.emit('message', this._connection.id, messages);
	}
}
