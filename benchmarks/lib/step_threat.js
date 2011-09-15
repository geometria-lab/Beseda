var util = require('util');
var hookio = require('../vendor/hook.io/lib/hookio.js');

var BesedaClient = require('../../client/nodejs');

var StepThreat = function(options) {
	hookio.Hook.call(this);

	this.__clents = [];
	this.__masterName = '';
	this.__transport = '';

	this.__isBlocked = false;

	if (options) {
		this.__transport = options.transport;
		this.__masterName = options.masterName;
		this.__makeClients(options.clientsCount);

		this.once('hook::ready', this.__handleReady.bind(this));

		this.once(options.masterName + '::wait', this.__handleWait.bind(this));
		this.once(options.masterName + '::kill', this.__handleKill.bind(this));
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
			if (!self.__isBlocked)
				self.emit('subscribed');
		});

		this.__clents[i].on('error', function() {
			if (!self.__isBlocked)
				self.emit('subscribeError');
		});
	}
};

StepThreat.prototype.__handleWait = function() {
	var self = this;

	for (var i = 0; i < this.__clents.length; i++) {
		this.__clents[i].removeAllListeners('error');
		this.__clents[i].on('error', function() {
			if (!self.__isBlocked)
				self.emit('messageError');
		});

		this.__clents[i].on('message', function(channel, message) {
			if (!self.__isBlocked)
				self.emit('message', message);
		});
	}
};

StepThreat.prototype.__handleKill = function() {
	/*for (var i = 0; i < this.__clents.length; i++) {
		this.__clents[i].removeAllListeners('error');
		this.__clents[i].removeAllListeners('message');

		this.__clents[i].
		this.__clents[i].disconnect();
	}
	
	this.__clents = [];
	this.__isBlocked = true;

	this.emit('suicide', this.name);*/

	var self = this;
	var j = 0;
	var disconnectHandler = function() {
		j++;
		
		if (j === self.__clents.length) {
			self.emit('suicide', self.name);
			self.__clents = [];
		}
	}

	for (var i = 0; i < this.__clents.length; i++) {
		this.__clents[i].removeAllListeners('error');
		this.__clents[i].removeAllListeners('message');

		this.__clents[i].once('disconnect', disconnectHandler);
		this.__clents[i].once('error', disconnectHandler);
		this.__clents[i].disconnect();
	}

	this.__isBlocked = true;
};

module.exports.StepThreat = StepThreat;