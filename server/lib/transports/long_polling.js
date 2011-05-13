var Router = require('./router.js');

exports = LongPollingTransport = function(io) {
    this.io = io;
    this._connections = {};

    this.io.server.router.get('/beseda/io/longPolling/:id', this._holdRequest.bind(this));
    this.io.server.router.post('/beseda/io/longPolling/:id', this._receive.bind(this));

    this._flushInterval = setInterval(this._flushConnections.bind(this),
                                      LongPollingTransport.CHECK_INTERVAL);
}

LongPollingTransport.CHECK_INTERVAL = 1000;
LongPollingTransport.MAX_LOOP_COUNT = 10;

LongPollingTransport.create = function(connectionId) {
    this._connections[connectionId] = new LongPollingTransport.Connection(this, connectionId);

    return this._connections[connectionId];
}

LongPollingTransport.prototype._holdRequest = function(request, response, params) {
    if (!this._connections[params.id]) {
        return Router.Utils.sendJSON(response, {
            error : 'Invalid connection id'
        }, 404);
    }

    this._connections[params.id].hold(request, response);
}

LongPollingTransport.prototype._receive = function(request, response, params) {
    if (!this._connections[params.id]) {
        return Router.Utils.sendJSON(response, {
            error : 'Invalid connection id'
        }, 404);
    }

    this._connections[params.id].receive(request, response);
}

LongPollingTransport.prototype._flushConnections = function() {
	for (var id in this._connections) {
		this._connections[id].waitOrFlush();
	}
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
};

LongPollingTransport.Connection.prototype.send = function(data) {
    this._dataQueue.push(data);
	++this._updateFlag;
}

LongPollingTransport.Connection.prototype.hold = function(request, response) {
    if (this._response !== null) {
        this._flush();
    }

    this._response    = response;
    this._currentFlag = this._updateFlag;
    this._loopCount   = LongPollingTransport.MAX_LOOP_COUNT;
}

LongPollingTransport.Connection.prototype.receive = function(request, response) {
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

LongPollingTransport.Connection.prototype._flush = function() {
    Router.Utils.sendJSON(this._response, {
        messages : JSON.stringify(this._dataQueue)
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

LongPollingTransport.Receiver.prototype._collectData = function(chunk) {
    this._data += chunk;
}

LongPollingTransport.Receiver.prototype._end = function() {
    Router.Utils.send(this._response);

    this._connection.transport.io.receive(this._connection.id, JSON.parse(this._data));

	this._request.removeListener('data', this._collectData.bind(this));
	this._request.removeListener('end', this._end.bind(this));
}