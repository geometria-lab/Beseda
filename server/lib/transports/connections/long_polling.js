var util = require('util');

var Router = require('./../../router.js');
var Connection = require('./connection.js');

var FLUSH_LOOP_COUNT = 500;
var DESTROY_LOOP_COUNT = 600;

var LongPollingConnection = function(id) {
	Connection.call(this, id);

	this._updateFlag  = 0;
	this._currentFlag = 0;
	this._loopCount   = DESTROY_LOOP_COUNT;

	this._dataQueue = [];
	this._response  = null;
};

util.inherits(LongPollingConnection, Connection);

LongPollingConnection.prototype.write = function(data) {
    this._dataQueue.push(data);
	++this._updateFlag;
};

LongPollingConnection.prototype.apply = function(request, response, head) {
    this._send(response, '{ "connectionId" : "' + this._id + '" }');
	return true;
};

LongPollingConnection.prototype.hold = function(request, response, params) {
    if (this._response !== null) {
        this._flush();
    }

    this._response = response;
    this._currentFlag = this._updateFlag;
    this._loopCount = DESTROY_LOOP_COUNT;
};

LongPollingConnection.prototype.receive = function(request, response, params) {
	var data = [];
	var push = data.push.bind(data);
	request.on('data', push);

	var self = this;
	request.once('end', function() {
		request.removeListener('data', push);
		self.handleData(data.join(''));
		Router.Utils.send(response, 200);
	});
};

LongPollingConnection.prototype.waitOrFlush = function() {
	if (this._loopCount <= 0) {
		this.disconnect();
	} else if (this._response) {
		if (this._loopCount <= FLUSH_LOOP_COUNT ||
			this._dataQueue.length > 0 ||
			this._currentFlag !== this._updateFlag) {

			this._flush();
		}
	}

	this._loopCount--;
};

LongPollingConnection.prototype._flush = function() {
	this._send(this._response, JSON.stringify(this._dataQueue))
	this._dataQueue = [];
	this._response = null;
};

LongPollingConnection.prototype._send = function(response, data) {
	Router.Utils.sendJSON(response, data);
};

module.exports = LongPollingConnection;