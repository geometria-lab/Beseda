// TODO: Подробнее оповещать об ошибке!
///////////////////////////////////////////////////////////////////////////////
//
//	Импорт зависимостей
//
///////////////////////////////////////////////////////////////////////////////

var events = require('events');
var util = require('util');
var qs = require('querystring');

var enums = require('./transports/enums');
var LongPolling = require('./transports/long-polling');
var PostData = require('./transports/post-data');

///////////////////////////////////////////////////////////////////////////////
//
//	Статичные переменный
//
///////////////////////////////////////////////////////////////////////////////

var LONG_POLLING  = 0;
var JSONP_POLLING = 1;
var WEB_SOCKET    = 2;

var TRANSPORS = { 
	'long-polling':  LONG_POLLING,
	'jsonp-polling': JSONP_POLLING,
	'web-socket': 	 WEB_SOCKET
};

///////////////////////////////////////////////////////////////////////////////
//
//	Реализация логики
//
///////////////////////////////////////////////////////////////////////////////

var lastID = 0;

var senderTable = {};
var receiverTable = {};

var emitter = new events.EventEmitter();

function init(transport, request, response) {
	var id = String(++lastID);

	switch (TRANSPORS[transport]) {
		case LONG_POLLING: 
			return initLongPolling(id, request, response);

		case JSONP_POLLING:
			return initJSONPPolling(id, request, response);
			
	}
};

function initLongPolling(id, request, response) {
	if (LongPolling.init(id) && 
		PostData.init(id)) {
		
		senderTable[id] = LongPolling;
		receiverTable[id] = PostData;

		response.end(id);
	} else {
		response.end(enums.BUFFER_ERROR);
	}
}

function initJSONPPolling(id, request, response) {
	var query = request.url.split('?')[1];

	if (query) {
		
		var callback = qs.parse(query)['callback'];
	
		if (LongPolling.init(id, true) && 
			PostData.init(id)) {
		
			senderTable[id] = LongPolling;
			receiverTable[id] = PostData;

			response.end(callback + '("' + id + '");');
		} else {
			response.end(enums.BUFFER_ERROR);
		} 
		
	} else {
		response.end(enums.BUFFER_ERROR);
	} 
}

function processRequest(id, request, response) {
	if (senderTable[id] && receiverTable[id]) {
		switch (request.method) {
			case enums.METHOD_POST: {
				receiverTable[id].handle(id, request, response);
				return;
			}
		
			case enums.METHOD_GET: {
				senderTable[id].hold(id, request, response);
				return;
			}
		}
	}

	response.end(enums.BUFFER_ERROR);
};

function write(id, data) {
	if (senderTable[id]) {
		senderTable[id].write(id, data);
	}
}


///////////////////////////////////////////////////////////////////////////////
//
//	Експорт модуля
//
///////////////////////////////////////////////////////////////////////////////

exports.emitter = emitter;
exports.init = init;
exports.processRequest = processRequest;
exports.write = write;

///////////////////////////////////////////////////////////////////////////////
//
//	Инициализация
//
///////////////////////////////////////////////////////////////////////////////

PostData.setEmmiter(emitter);

