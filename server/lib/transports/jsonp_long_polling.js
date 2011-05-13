var protocol = require('./protocol.js');

exports = LongPollingTransport = { }

LongPollingTransport._connections = {}
LongPollingTransport.CHECK_INTERVAL = 1000;
LongPollingTransport.MAX_LOOP_COUNT = 10;

LongPollingTransport.Connection = function() {
	this.updateFlag = 0;
	this.currentFlag = 0;
	this.loopCount = LongPollingTransport.MAX_LOOP_COUNT;

	this.dataQueue = [];
	this.response = null;

	this.isJSONP = false;
	this.jsonpCallback = null;
};

LongPollingTransport.Connection.prototype.flush = function() {
    var i = 0;
	var l = this.dataQueue.length;
	var separator = protocol.BUFFER_SEPARATOR;

	if (this.isJSONP) {
		this.response.write(this.jsonpCallback);
		this.response.write("(");

		separator = protocol.BUFFER_JS_SEPARATOR;
	}

	while (i < l) {
		if (i > 0) {
			this.response.write(separator);
		}

		pollingData.response.write(pollingData.dataQueue[i]);

		++i;
	}

	if (pollingData.isJSONP) {
		pollingData.response.write(");");
	}

	pollingData.response.end(enums.NEW_LINE_BUFFER);

	pollingData.dataQueue = [];
	pollingData.response = null;
}

LongPollingTransport._handleCheckIteration = function() {
	for (var id in this._connections) {
		var connection = this._connections[id];

		if (connection.response) {
			if (connection.loopCount <= 0 ||
				connection.dataQueue.length > 0 ||
				connection.currentFlag !== connection.updateFlag) {
				this._flush(connection);
			} else {
				connection.loopCount--;
			}
		}
	}
}

LongPollingTransport._flush = function(connection) {

}

var connectionMap = {};

var LongPolling

function

function flush(pollingData) {

}

///////////////////////////////////////////////////////////////////////////////
//
//	Експорт модуля
//
///////////////////////////////////////////////////////////////////////////////

var init = exports.init = function(id, isJSONP) {
	if (connectionMap[id]) {
		return false;
	}

	connectionMap[id] = new LongPolling();
	connectionMap[id].isJSONP = isJSONP;

	return true;
};

var write = exports.write = function(id, data) {
	var pollingData = connectionMap[id];

	if (pollingData) {
		var stringData = data.toString();
		if (pollingData.isJSONP) {
			stringData = JSON.stringify(stringData);
		}

		pollingData.dataQueue.push(new Buffer(stringData));
		++pollingData.updateFlag;
	}
};

var hold = exports.hold = function(id, request, response) {
	var pollingData = connectionMap[id];

	if (pollingData) {
		if (pollingData.response !== null) {
			flush(pollingData);
		}

		if (pollingData.isJSONP) {
			var query = request.url.split('?')[1];

			if (!query) {
				return false;
			}

			pollingData.jsonpCallback = new Buffer(qs.parse(query)['callback']);
		}

		pollingData.response = response;
		pollingData.currentFlag = pollingData.updateFlag;
		pollingData.loopCount = MAX_LOOP_COUNT;
	}

	return true;
};


///////////////////////////////////////////////////////////////////////////////
//
//	Инициализация
//
///////////////////////////////////////////////////////////////////////////////

setInterval(handleCheckIteration, CHECK_INTERVAL);


