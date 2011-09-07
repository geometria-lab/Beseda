var util = require('util');
var hookio = require('hook.io');

var BesedaClient = require('./../../client/nodejs');

var StepThreat = function(options) {
	hookio.Hook.call(this);

	this.__clents = [];
	this.__masterName = '';
	this.__transport = '';

	if (options) {
		this.__transport = options.transport;
		this.__masterName = options.masterName;
		this.__makeClients(options.clientsCount);

		this.on('hook::ready', this.__handleReady.bind(this));

		this.on(options.masterName + '::wait', this.__handleWait.bind(this));
		this.on(options.masterName + '::kill', this.__handleKill.bind(this));
	}
};

util.inherits(StepThreat, hookio.Hook);

StepThreat.prototype.__makeClients = function(count) {
	for (var i = 0; i < count; i++) {
		this.__clents.push(new BesedaClient({ transport: this.__transport }));
	}
};

StepThreat.prototype.__handleReady = function() {
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

StepThreat.prototype.__handleWait = function() {
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

StepThreat.prototype.__handleKill = function() {
	var self = this;

	for (var i = 0; i < this.__clents.length; i++) {
		this.__clents[i].removeAllListeners('error');
		this.__clents[i].removeAllListeners('message');
		this.__clents[i].disconnect();
	}
	
	this.__clents = [];
};

module.exports.StepThreat = StepThreat;