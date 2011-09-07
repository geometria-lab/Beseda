var events = require('events');
var util = require('util');

var StepThreat = require('./step_threat').StepThreat;
var BesedaClient = require('./../../client/nodejs');

var Step = function(options, defaults) {
	events.EventEmitter.call(this);

	this.__subscribersCount = options.subscribers || defaults.subscribers;
	this.__publishCount = options.publish || defaults.publish;
	this.__transport = options.transport || defaults.transport;

	this.__connectionCount = 0;
	this.__messageCount = 0;
	this.__errorCount = 0;

	this.__threadCount = 2;

	this.__averageTime = 0;

	this.__result = null;
	this.__options = options;
};

util.inherits(Step, events.EventEmitter);

Step.prototype.getResults = function() {
	return this.__result;
};

Step.prototype.getOptions = function() {
	return this.__options;
};

Step.prototype.run = function() {
	this.__step = new StepThreat();
	this.__step.name = Math.random().toString().substr(3);
	
	this.__step.on('hook::ready', this.__handleReadyToRun.bind(this));

	this.__step.on('*::subscribed', this.__handleSubscribe.bind(this));
	this.__step.on('*::message', this.__handleMessage.bind(this));

	this.__step.on('*::subscribeError', this.__handleSubscribeError.bind(this));
	this.__step.on('*::messageError', this.__handleMessageError.bind(this));

	this.__step.start();
};

Step.prototype.__startPublish = function() {
	var self = this;
	var client = new BesedaClient({'transport': this.__transport});

	var i = 0;

	function publish() {
		client.publish('/hello' + self.__step.name, Date.now().toString(), function() {
			if (++i < self.__publishCount) {
				setTimeout(publish, 100);
			} else {
				client.disconnect();
				setTimeout(self.__handleFinish.bind(self), 5000);
			}
		});
	}

	setTimeout(publish, 1000);

	client.on('error', function() {
		client.disconnect();
		setTimeout(self.__handleFinish.bind(self), 5000);
	})
};

Step.prototype.__checkEveryoneSubscribed = function() {
	if (this.__errorCount + this.__connectionCount === this.__subscribersCount) {
		this.__step.emit('wait');
		this.__startPublish();
	}
}

Step.prototype.__handleReadyToRun = function() {
	var restCount = this.__subscribersCount;
	var threatSubscribersCount = Math.ceil(this.__subscribersCount / this.__threadCount);

	var threats = [];
	var type = __dirname + '/step_threat';
	while (restCount > threatSubscribersCount) {
		threats.push({
			'type': type,
			'clientsCount': threatSubscribersCount,
			'masterName': this.__step.name,
			'transport': this.__transport
		});

		restCount -= threatSubscribersCount;
	}

	threats.push({
		'type': type,
		'clientsCount': restCount,
		'masterName': this.__step.name,
		'transport': this.__transport
	});

	this.__step.spawn(threats);
};

Step.prototype.__handleSubscribe = function() {
	this.__connectionCount++;
	this.__checkEveryoneSubscribed();
};

Step.prototype.__handleMessage = function(message) {
	this.__messageCount++;
	this.__averageTime = ((this.__messageCount - 1) * this.__averageTime + Date.now() - message) / this.__messageCount;
};

Step.prototype.__handleSubscribeError = function() {
	this.__errorCount++;
	this.__checkEveryoneSubscribed();
};

Step.prototype.__handleMessageError = function() {
	this.__errorCount++;
};

Step.prototype.__handleFinish = function() {
	this.__step.emit('kill');

	this.__result = {
		'errors': this.__errorCount,
		'messages': this.__messageCount,
		'lost': (this.__subscribersCount * this.__publishCount - this.__messageCount),
		'time': Math.round(this.__averageTime)
	};

	console.log(this.__result);
	
	this.emit('finish');
};


module.exports = Step;