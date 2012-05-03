var events = require('events');
var util = require('util');

var RequestStream = function(request) {
	events.EventEmitter.call(this);

	this.__request = request;

	this.__isPaused = false;
	this.__isEnded = false;
	this.__pauseBuffer = [];

	this.__collectData = this.__collectData.bind(this);
	this.__registerEnd = this.__registerEnd.bind(this);

	this.__request.addListener('data', this.__collectData);
	this.__request.addListener('end', this.__registerEnd);
};

util.inherits(RequestStream, events.EventEmitter);

RequestStream.prototype.destroy = function() {
	this.__request.connection.destroy();
};

RequestStream.prototype.pause = function() {
	this.__request.pause();
	this.__isPaused = true;
};

RequestStream.prototype.resume = function() {
	this.__flush();
	this.__request.resume();
	this.__isPaused = false;
};

RequestStream.prototype.__collectData = function(chunk) {
	if (this.__isPaused) {
		this.__pauseBuffer.push(chunk);
	} else {
		this.emit('data', chunk);
	}
};

RequestStream.prototype.__registerEnd = function() {
	if (this.__isPaused) {
		this.__isEnded = true;
	} else {
		this.emit('end');
	}

	this.__request.removeListener('data', this.__collectData);
	this.__request.removeListener('end', this.__registerEnd);
};

RequestStream.prototype.__flush = function() {
	if (this.__pauseBuffer.length > 0) {
		this.emit('data', this.__pauseBuffer.join(''));
	}

	if (this.__isEnded) {
		this.emit('end');
	}

	this.__pauseBuffer.length = 0;
};

module.exports = RequestStream;