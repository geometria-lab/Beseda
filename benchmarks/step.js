var util = require('util');
var hookio = require('hook.io');

var BesedaClient = require('./../client/nodejs');

var Step = function(options) {
	hookio.Hook.call(this);

	this.__clents = [];
	this.__masterName = '';

	if (options) {
		this.__makeClients(options.clientsCount);
		this.__masterName = options.masterName;

		this.on('hook::ready', this.__handleReady.bind(this));

		this.on(options.masterName + '::wait', this.__handleWait.bind(this));
		this.on(options.masterName + '::kill', this.__handleKill.bind(this));
	}
};

util.inherits(Step, hookio.Hook);

Step.prototype.__makeClients = function(count) {
	for (var i = 0; i < count; i++) {
		this.__clents.push(new BesedaClient({ transport: 'longPolling' }));
	}
};

Step.prototype.__handleReady = function() {
	var self = this;

	for (var i = 0; i < this.__clents.length; i++) {
		this.__clents[i].subscribe('/hello' + this.__masterName, function() {
			self.emit('subscribed');
		});

		this.__clents[i].once('error', function() {
			self.emit('subscribeError');
		});
	}
};

Step.prototype.__handleWait = function() {
	var self = this;

	for (var i = 0; i < this.__clents.length; i++) {
		this.__clents[i].removeAllListeners('error');
		this.__clents[i].once('error', function() {
			self.emit('messageError');
		});

		this.__clents[i].on('message', function(channel, message) {
			self.emit('message', message);
		});
	}
};

Step.prototype.__handleKill = function() {
	var self = this;

	for (var i = 0; i < this.__clents.length; i++) {
		this.__clents[i].removeAllListeners('error');
		this.__clents[i].removeAllListeners('message');
		this.__clents[i].disconnect();
	}
	
	this.__clents = [];
};

module.exports.Step = Step;