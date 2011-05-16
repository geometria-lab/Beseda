var util = require('util');

var Router               = require('./../router.js'),
	LongPollingTransport = require('./long_polling.js');

module.exports = JSONPLongPollingTransport = function(io) {
	JSONPLongPollingTransport._super.constructor.call(this, io);

	this._connection = JSONPLongPollingTransport.Connection;
}

util.inherits(JSONPLongPollingTransport, LongPollingTransport);

JSONPLongPollingTransport.prototype._addRoutes = function() {
	this.io.server.router.get('/beseda/io/JSONPLongPolling/:id', this._holdRequest.bind(this));
    this.io.server.router.get('/beseda/io/JSONPLongPolling/:id/send', this._receive.bind(this));
}

JSONPLongPollingTransport.Connection = function(transport, connectionId) {
	JSONPLongPollingTransport.Connection._super.constructor.call(this, transport, connectionId);

	this._callback = null;
}

util.inherits(JSONPLongPollingTransport.Connection, LongPollingTransport.Connection);

JSONPLongPollingTransport.Connection.prototype.hold = function(request, response) {
	var callback = request.url.split('?callback=');

	if (!callback || !callback[1]) {
		return Router.Utils.sendJSON(response, {
			error : 'Callback not present'
		}, 400);
	}

	JSONPLongPollingTransport.Connection._super.hold.call(this, request, response);

	this._callback = callback;
}

LongPollingTransport.Connection.prototype.receive = function(request, response, params) {
    if (params.messages === undefined) {
		return Router.Utils.sendJSON(response, {
			error : 'Messages not present'
		}, 400);
	}

	var messages = JSONPLongPollingTransport.parseMessages(response, params.messages);
	if (messages) {
		this.transport.emit('message', this.id, messages);
	}
}

LongPollingTransport.Connection.prototype._flush = function() {
    Router.Utils.sendJSON(this._response, {
		callback : this._callback,
        messages : this._dataQueue
    });

	this._dataQueue = [];
	this._response = null;
	this._callback = null;
}