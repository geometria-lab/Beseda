var events = require('events');
var util = require('util');

var Step = require('./step').Step;
var BesedaClient = require('./../client/nodejs');

var StepWrapper = function(options) {
	events.EventEmitter.call(this);

	this.__subscribersCount = options.subscribers;
	this.__publishCount = 10;

	this.__connectionCount = 0;
	this.__messageCount = 0;
	this.__errorCount = 0;

	this.__threadCount = 2;

	this.__averageTime = 0;
};

util.inherits(StepWrapper, events.EventEmitter);

StepWrapper.prototype.run = function() {
	this.__step = new Step();
	this.__step.name = Math.random().toString().substr(3);
	
	this.__step.on('hook::ready', this.__handleReadyToRun.bind(this));

	this.__step.on('*::subscribed', this.__handleSubscribe.bind(this));
	this.__step.on('*::message', this.__handleMessage.bind(this));

	this.__step.on('*::subscribeError', this.__handleSubscribeError.bind(this));
	this.__step.on('*::messageError', this.__handleMessageError.bind(this));

	this.__step.start();
};

StepWrapper.prototype.__startPublish = function() {
	var self = this;
	var client = new BesedaClient();
	var i = 0;

	function publish() {
		client.publish('/hello' + self.__step.name, Date.now());
		
		if (++i < self.__publishCount) {
			setTimeout(publish, 100);
		} else {
			setTimeout(self.__handleFinish.bind(self), 1000);
		}
	}

	publish();
};

StepWrapper.prototype.__checkEveryoneSubscribed = function() {
	if (this.__errorCount + this.__connectionCount === this.__subscribersCount) {
		console.log('Errors count: ' + this.__errorCount);
		console.log('Subscribe count: ' + this.__connectionCount);
		
		this.__step.emit('wait');
		this.__startPublish();
	}
}

StepWrapper.prototype.__handleReadyToRun = function() {
	var restCount = this.__subscribersCount;
	var threatSubscribersCount = Math.ceil(this.__subscribersCount / this.__threadCount);

	var threats = [];
	var type = __dirname + '/step';
	while (restCount > threatSubscribersCount) {
		threats.push({
			'type': type,
			'clientsCount': threatSubscribersCount,
			'masterName': this.__step.name
		});

		restCount -= threatSubscribersCount;
	}

	threats.push({
		'type': type,
		'clientsCount': restCount,
		'masterName': this.__step.name
	});

	this.__step.spawn(threats);
};

StepWrapper.prototype.__handleSubscribe = function() {
	this.__connectionCount++;
	this.__checkEveryoneSubscribed();
};

StepWrapper.prototype.__handleMessage = function(message) {
	this.__messageCount++;
	this.__averageTime = ((this.__messageCount - 1) * this.__averageTime + Date.now() - message) / this.__messageCount;
};

StepWrapper.prototype.__handleSubscribeError = function() {
	this.__errorCount++;
	this.__checkEveryoneSubscribed();
};

StepWrapper.prototype.__handleMessageError = function() {
	this.__errorCount++;
};

StepWrapper.prototype.__handleFinish = function() {
	console.log('Errors count: ' + this.__errorCount);
	console.log('Message count: ' + this.__messageCount);
	console.log('Lost count: ' + (this.__subscribersCount * this.__publishCount - this.__messageCount));
	console.log('Average time: ' + Math.round(this.__averageTime));

	this.__step.emit('kill');
	this.emit('finish');
};


module.exports = StepWrapper;