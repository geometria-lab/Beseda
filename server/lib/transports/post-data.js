///////////////////////////////////////////////////////////////////////////////
//
//	Импорт зависимостей
//
///////////////////////////////////////////////////////////////////////////////

var enums = require('./enums');

///////////////////////////////////////////////////////////////////////////////
//
//	Реализация логики
//
///////////////////////////////////////////////////////////////////////////////

var emitter;

var receiverMap = {};

var PostDataReceiver = function(id) {
	this.__id = id;
	this.__postData = '';

	this.__request = null;
	this.__responce = null;
};

PostDataReceiver.prototype.handle = function(request, responce) {
	request.addListener(enums.EVENT_DATA, this.__handlePostChunk.bind(this));
	request.addListener(enums.EVENT_END, this.__handlePostData.bind(this));
	
	this.__request = request;
	this.__responce = responce;
};

PostDataReceiver.prototype.__handlePostChunk = function(chunk) {
	this.__postData += chunk;
};

PostDataReceiver.prototype.__handlePostData = function() {
	this.__responce.end(enums.BUFFER_OK);

	emitter.emit(enums.EVENT_MESSAGE, this.__id, this.__postData);

	this.__request.removeAllListeners(enums.EVENT_DATA);
	this.__request.removeAllListeners(enums.EVENT_END);

	this.__postData = '';
	this.__request = null;
	this.__responce = null;
};

///////////////////////////////////////////////////////////////////////////////
//
//	Експорт модуля
//
///////////////////////////////////////////////////////////////////////////////

exports.setEmmiter = function(instance) {
	emitter = instance;
};

exports.init = function(id) {
	if (receiverMap[id]) {
		return false;
	} 

	receiverMap[id] = new PostDataReceiver(id);
	
	return true;
};

exports.handle = function(id, request, response) {
	var receiver = receiverMap[id];

	if (receiver) {
		receiver.handle(request, response);
	}
};


