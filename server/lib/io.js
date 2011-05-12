var Router = require('./router.js');

var LongPollingTransport      = require('./transports/long_polling.js'),
	JSONPLongPollingTransport = require('./transports/jsonp_long_polling.js'),
	PostTransport	          = require('./transports/post.js');

module.exports = IO = function(server) {
	process.EventEmitter.call(this);

	this.lastID = 0;

	// Add routes
	var connectRoute = new Router.Route('/beseda/io/connect/:transport',
										this._handleConnect.bind(this),
										'GET');
	this.server.router.addRoute(connectRoute);

	var requestRoute = new Router.Route('/beseda/io/:id',
										this.__handleRequest.bind(this)
										['POST', 'GET']);
	this.server.router.addRoute(requestRoute);
}

util.inherits(Server, process.EventEmitter);

IO.LONG_POLLING       = 0;
IO.JSONP_LONG_POLLING = 1;
IO.WEB_SOCKET         = 2;
IO.FLASH_SOCKET       = 3;

IO.TRANSPORS = { 
	'longPolling'      : LONG_POLLING,
	'JSONPLongPolling' : JSONP_LONG_POLLING,
	'webSocket'        : WEB_SOCKET,
	'flashSocket'      : FLASH_SOCKET
};

IO.prototype._handleConnect = function(request, response, params) {
	var id = String(++this.lastID);

	if (this.server.options.transport.indexOf(params.transport) !== -1)) {
		// Server send resonse with present transports
	} else {
		switch (params.transport) {
			case IO.LONG_POLLING:
				return initLongPolling(id, request, response);
			case IO.JSONP_LONG_POLLING:
				return initJSONPLongPolling(id, request, response);
			default:
				throw new Error(params.transport + ' not implement yet');
		}
	}
}

IO.prototype._handleRequest = function(request, response, params) {
	io.processRequest(params.id, request, response);
}







// TODO: Подробнее оповещать об ошибке!
///////////////////////////////////////////////////////////////////////////////
//
//	Импорт зависимостей
//
///////////////////////////////////////////////////////////////////////////////






    			   // TODO: стандатрный обработчик статики в роутере

    			   



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

