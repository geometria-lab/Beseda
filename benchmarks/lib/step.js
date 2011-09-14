var events = require('events');
var util = require('util');

var Table = require('./cli-table');
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

	this.__client = null;
};

util.inherits(Step, events.EventEmitter);

Step.LAST_ID = 0;

Step.prototype.getResults = function() {
	return this.__result;
};

Step.prototype.getOptions = function() {
	this.__options.publish = this.__publishCount
	return this.__options;
};

Step.prototype.run = function() {
	this.__step = new StepThreat();
	this.__step.name = Date.now().toString() + Step.LAST_ID++;
	
	this.__step.on('hook::ready', this.__handleReadyToRun.bind(this));

	this.__step.on('*::subscribed', this.__handleSubscribe.bind(this));
	this.__step.on('*::message', this.__handleMessage.bind(this));

	this.__step.on('*::subscribeError', this.__handleSubscribeError.bind(this));
	this.__step.on('*::messageError', this.__handleMessageError.bind(this));

	this.__step.start();
};

Step.prototype.__startPublish = function() {
	this.__client = new BesedaClient({'transport': this.__transport});

	var self = this;
	var i = 0;

	function publish() {
		self.__client.publish(
			'/hello' + self.__step.name, Date.now().toString(),
			function() {
				i++;

				if (i < self.__publishCount) {
					publish();
				} else {
					setTimeout(self.__handleFinish.bind(self), 2000);
				}
			}
		);
	}

	this.__client.once('error', function() {
		setTimeout(self.__handleFinish.bind(self), 1000);
	});

	publish();
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
			'name': Date.now().toString() + Step.LAST_ID++,
			'transport': this.__transport
		});

		restCount -= threatSubscribersCount;
	}

	threats.push({
		'type': type,
		'clientsCount': restCount,
		'masterName': this.__step.name,
		'name': Date.now().toString() + Step.LAST_ID++,
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

	this.__client.removeAllListeners('error');
	this.__client.disconnect();

	this.__result = {
		'errors': this.__errorCount,
		'messages': this.__messageCount,
		'lost': this.__subscribersCount * this.__publishCount - this.__messageCount,
		'time': Math.round(this.__averageTime)
	};

	var table = new Table({
		colWidths: [14, 14, 14, 14, 14],
		colAligns: 'middle'
	});

	table.push([
		this.__options.subscribers,
		this.__publishCount,
		this.__result.time,
		this.__result.lost,
		this.__result.errors
	]);

	console.log(table.toString());
	
	this.__client.disconnect();

	var self = this;

	var i = 0
	for (var name in this.__step.children) {
		this.__step.children[name].monitor.once('exit', function() {
			i++;

			if (i === self.__threadCount) {
				self.emit('finish');
			}
		});

		this.__step.once(name + '::suicide', this.__handleSuicide.bind(this));
	}
};

Step.prototype.__handleSuicide = function(name) {
	this.__step.children[name].monitor.stop();
};

module.exports = Step;