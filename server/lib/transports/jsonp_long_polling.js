var util = require('util'),
    qs = require('querystring');

var Router               = require('./../router.js'),
	LongPollingTransport = require('./long_polling.js');

var JSONPLongPollingTransport = module.exports = function(io) {
	LongPollingTransport.call(this, io);

	this._connection = JSONPLongPollingTransport.Connection;
}

util.inherits(JSONPLongPollingTransport, LongPollingTransport);

JSONPLongPollingTransport.sendJSONP = function(response, json, callback, code, headers) {
	headers = headers || {};

	headers['Server'] = 'Beseda';
	headers['Content-Type'] = 'text/javascript';

	response.writeHead(code || 200, headers);
    response.end(callback + '(' + json + ');');
}

JSONPLongPollingTransport.prototype._addRoutes = function() {
	this.io.server.router.get(
		'/beseda/io/JSONPLongPolling/:id/:time', 
		this._holdRequest.bind(this)
	);
	
    this.io.server.router.get(
    		'/beseda/io/JSONPLongPolling/:id/send/:time', 
    		this._receive.bind(this)
    	);
    	
    this.io.server.router.get(
    		'/beseda/io/JSONPLongPolling/:id/destroy/:time', 
    		this._destroy.bind(this)
    	);
}

JSONPLongPollingTransport.prototype._sendApplyConnection = function(connectionId, request, response) {
	var callback = qs.parse(request.url.split('?')[1]).callback;

	if (callback) {
		JSONPLongPollingTransport.sendJSONP(response, JSON.stringify({ 
			connectionId : connectionId 
		}), callback);
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

	JSONPLongPollingTransport.sendJSONP(response, '', params.callback);

	var messages = LongPollingTransport.parseMessages(response, params.messages);
	if (messages) {
		this.transport.emit('message', this.id, messages);
	}
}

JSONPLongPollingTransport.Connection.prototype._flush = function() {
	JSONPLongPollingTransport.sendJSONP(
		this._response, JSON.stringify(this._dataQueue), this._callback
	);

	this._dataQueue = [];
	this._response = null;
	this._callback = null;
}
