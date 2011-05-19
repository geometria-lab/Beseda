var util = require('util');
var qs = require('querystring')

var Router               = require('./../router.js'),
	LongPollingTransport = require('./long_polling.js');

var JSONPLongPollingTransport = module.exports = function(io) {
	LongPollingTransport.call(this, io);

	this._connection = JSONPLongPollingTransport.Connection;
}

util.inherits(JSONPLongPollingTransport, LongPollingTransport);

JSONPLongPollingTransport.sendJSONP = function(response, data, callback, code, headers) {
	headers = headers || {};

	headers['Server'] = 'Beseda';
	headers['Content-Type'] = 'text/javascript';

	response.writeHead(code || 200, headers);
    response.end(callback + '(' + JSON.stringify(data) + ');', 'utf8');
}

JSONPLongPollingTransport.prototype._addRoutes = function() {
	this.io.server.router.get('/beseda/io/JSONPLongPolling/:id', this._holdRequest.bind(this));
    this.io.server.router.get('/beseda/io/JSONPLongPolling/:id/send', this._receive.bind(this));
    this.io.server.router.get('/beseda/io/JSONPLongPolling/:id/destroy', this._destroy.bind(this));
}

JSONPLongPollingTransport.prototype._sendApplyConnection = function(connectionId, request, response) {
	var callback = qs.parse(request.url.split('?')[1]).callback;

	if (callback) {
		JSONPLongPollingTransport.sendJSONP
			(response, { connectionId : connectionId }, callback);
	}
}

JSONPLongPollingTransport.Connection = function(transport, connectionId) {
	LongPollingTransport.Connection.call(this, transport, connectionId);

	this._callback = null;
}

util.inherits(JSONPLongPollingTransport.Connection, LongPollingTransport.Connection);

JSONPLongPollingTransport.Connection.prototype.hold = function(request, response, params) {
	
	var callback = params.callback;

	if (callback) {
	
		LongPollingTransport.Connection.prototype.hold.call(this, request, response);

		this._callback = callback;

	} else {
		Router.Utils.sendJSON(response, {
			error : 'Callback not present'
		}, 400);
	}
}

JSONPLongPollingTransport.Connection.prototype.receive = function(request, response, params) {
    if (params.messages === undefined) {
		return Router.Utils.sendJSON(response, {
			error : 'Messages not present'
		}, 400);
	}

	JSONPLongPollingTransport.sendJSONP(response, { success : true }, params.callback);

	var messages = LongPollingTransport.parseMessages(response, params.messages);
	if (messages) {
		this.transport.emit('message', this.id, messages);
	}
}

JSONPLongPollingTransport.Connection.prototype._flush = function() {
	JSONPLongPollingTransport.sendJSONP(this._response, this._dataQueue, this._callback);

	this._dataQueue = [];
	this._response = null;
	this._callback = null;
}
