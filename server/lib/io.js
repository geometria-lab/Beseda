var util = require('util');

// TODO: Client ID to hash

var Router = require('./router.js');

var LongPollingTransport      = require('./transports/long_polling.js'),
	JSONPLongPollingTransport = require('./transports/jsonp_long_polling.js');

module.exports = IO = function(server) {
	process.EventEmitter.call(this);

    this.server = server;

	this._lastConnectionId = 0;

    this._transports = {};
    this._connections = {};

	this.server.router.get('/beseda/io/:transport', this._handleConnect.bind(this));
}

util.inherits(IO, process.EventEmitter);

IO.TRANSPORTS = {
	longPolling      : LongPollingTransport,
	JSONPLongPolling : JSONPLongPollingTransport
};

IO.prototype.send = function(connectionId, message) {
	if (!this._connections[connectionId]) {
        throw new Error('Can\'t send to unavailble connection ' + connectionId)
    }

    this._connections[connectionId].send(message);
};

IO.prototype._getTransport = function(name) {
    if (!this._transports[name]) {
        this._transports[name] = new IO.TRANSPORTS[name](this);

		this._transports[name].on('message', this._onMessage.bind(this));
		this._transports[name].on('disconnect', this._onDisconnect.bind(this));
    }

    return this._transports[name];
}

IO.prototype._handleConnect = function(request, response, params) {
	if (this.server.options.transports.indexOf(params.transport) !== -1) {
        var connectionId = ++this._lastConnectionId;
        var transport = this._getTransport(params.transport);

        this._connections[connectionId] = transport.createConnection(connectionId, request, response);
	} else {
        Router.Utils.sendJSON(response, {
            error               : 'Invalid transport',
            availableTransports : this.server.options.transports });
    }
}

IO.prototype._onMessage = function(connectionId, messages) {
    for (var i = 0; i < messages.length; i++) {
        this.emit('message', connectionId, messages[i]);
    }
}

IO.prototype._onDisconnect = function(connectionId) {
    this.emit('disconnect', connectionId);
}
