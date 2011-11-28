var util = require('util');

var Router = require('./../../router.js');
var Connection = require('./connection.js');

var LongPollingConnection = function(id) {
	Connection.call(this, id);

	this._updateFlag  = 0;
	this._currentFlag = 0;
	this._updateTime = Date.now();

	this._dataQueue = [];
	this._response  = null;

	this._flush = this._flush.bind(this);
};

util.inherits(LongPollingConnection, Connection);

LongPollingConnection.prototype.write = function(data) {
    this._dataQueue.push(data);
	this._updateFlag++;
};

LongPollingConnection.prototype.apply = function(request, response, head) {
    this._send(response, '{ "connectionId" : "' + this._id + '" }');
	return true;
};

LongPollingConnection.prototype.hold = function(request, response, params) {
    if (this._response !== null) {
	    process.nextTick(this._flush);
    }

    this._response = response;
    this._currentFlag = this._updateFlag;
	this._updateTime = Date.now();
};

LongPollingConnection.prototype.receive = function(request, response, params) {
	var self = this;
	var data = [];

	request.on('data', data.push.bind(data));
	request.once('end', function() {
		Router.Utils.send(response, 200);

		request.removeAllListeners('data');
		
		self.handleData(data.join(''));
	});
};

LongPollingConnection.prototype.waitOrFlush = function() {
	var lifeTime = Date.now() - this._updateTime;
	if (lifeTime > 600000) {
		this._transport.destroyConnection(this._id);
	} else if (this._response !== null) {
		if (lifeTime > 25000 ||
			this._dataQueue.length > 0 ||
			this._currentFlag !== this._updateFlag) {

			process.nextTick(this._flush);
		}
	}
};

LongPollingConnection.prototype._flush = function() {
	this._send(this._response, JSON.stringify(this._dataQueue));

	this._dataQueue = [];
	this._response = null;
};

LongPollingConnection.prototype._send = function(response, data) {
	Router.Utils.sendJSON(response, data);
};

module.exports = LongPollingConnection;