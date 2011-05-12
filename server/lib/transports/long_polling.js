///////////////////////////////////////////////////////////////////////////////
//
//	Импорт зависимостей
//
///////////////////////////////////////////////////////////////////////////////


exports.BUFFER_OK		 = new Buffer('OK');
exports.BUFFER_ERROR		 = new Buffer('ERROR');
exports.BUFFER_NEW_LINE  = new Buffer('\n');

exports.BUFFER_SEPARATOR = new Buffer('|');
exports.BUFFER_JS_SEPARATOR = new Buffer(' + "|" + ');

var http = require('http');
var url = require('url');
var qs = require('querystring');

var enums = require('./enums');

///////////////////////////////////////////////////////////////////////////////
//
//	Статичные переменный
//
///////////////////////////////////////////////////////////////////////////////

var CHECK_INTERVAL = 1000;
var MAX_LOOP_COUNT = 10;

///////////////////////////////////////////////////////////////////////////////
//
//	Реализация логики
//
///////////////////////////////////////////////////////////////////////////////

var connectionMap = {};

var LongPolling = function() {
	this.updateFlag = 0;
	this.currentFlag = 0;
	this.loopCount = MAX_LOOP_COUNT;
	
	this.dataQueue = [];
	this.response = null;

	this.isJSONP = false;
	this.jsonpCallback = null;
};

function handleCheckIteration() {
	var pollingData;
	
	for (var id in connectionMap) {
		pollingData = connectionMap[id];

		if (pollingData.response) {
			if (pollingData.loopCount <= 0 ||
				pollingData.dataQueue.length > 0 || 
				pollingData.currentFlag !== pollingData.updateFlag) {
				flush(pollingData);
			} else {
				pollingData.loopCount--;
			}
		}
	}
}

function flush(pollingData) {
	var i = 0;
	var l = pollingData.dataQueue.length;
	var separator = enums.BUFFER_SEPARATOR;

	if (pollingData.isJSONP) {
		pollingData.response.write(pollingData.jsonpCallback);
		pollingData.response.write("(");

		separator = enums.BUFFER_JS_SEPARATOR;
	}

	while (i < l) {
		if (i > 0) {
			pollingData.response.write(separator);
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


