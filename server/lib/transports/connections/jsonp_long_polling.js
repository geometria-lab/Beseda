var util = require('util');
var qs = require('querystring');
var Router = require('./../../router.js');
var LongPollingConnection = require('./long_polling.js');

var JSONPLongPollingConnection = function(id) {
	LongPollingConnection.call(this, id);

	this._callback = null;
};

util.inherits(JSONPLongPollingConnection, LongPollingConnection);

JSONPLongPollingConnection.prototype.apply = function(request, response, head) {
	var callback = qs.parse(request.url.split('?')[1]).callback;

	this.__sendJSONP
	    (response, '{ "connectionId" : "' + this._id + '" }', callback);

	return true;
};

JSONPLongPollingConnection.prototype.hold
	= function(request, response, params) {

	if (params.callback !== undefined) {
		this._callback = params.callback;

		LongPollingConnection.prototype.hold.call(this, request, response);
	} else {
		Router.Utils.send(response, 'Callback not present', 400);
	}
};

JSONPLongPollingConnection.prototype.receive = function(request, response, params) {
    if (params.messages !== undefined) {
	    this.__sendJSONP(response, '', params.callback);
	    this.handleData(params.messages)
	} else {
	    Router.Utils.send(response, 'Messages not present', 400);
    }
};

JSONPLongPollingConnection.prototype._send = function(response, data) {
	this.__sendJSONP(response, data, this._callback);
};

JSONPLongPollingConnection.prototype.__sendJSONP
	= function(response, data, callback) {

	response.writeHead(200, {
		'Server': 'Beseda',
		'Content-Type': 'text/javascript'
	});

    response.end(callback + '(' + data + ');');
};

module.exports = JSONPLongPollingConnection;