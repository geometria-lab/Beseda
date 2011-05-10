var Channel = require('./channel');
var utils = require('./utils');
var io = require('./io');

var sessions = {};

Session = module.exports = function(clientId, sessionID) {
    //this.server = server;
    this.clientID     = clientId;
    this.__sessionID = sessionID;

    this.isConnected = false;

	this.connectedTimestamp = 0;
    this.createdTimestamp = Date.now();

    if (sessions[this.clientID]) {
        throw new Error('Session with client ' + this.clientID + ' already exists.');
    } else {
        sessions[this.clientID] = this;
    }
};

Session.get = function(id) {
    return sessions[id];
};

Session.getAll = function() {
    return sessions;
};

Session.remove = function(id) {
    delete sessions[id];
};

Session.prototype.connect = function() {
	this.isConnected = true;
	this.connectedTimestamp = Date.now();
}

Session.prototype.subscribe = function(channels) {
    channels = utils.ensure(channels);

    for (var i = 0; i < channels.length; i++) {
		//this.server.monitor.increment("subscription");
        channels[i].subscribe(this);
    }
};

Session.prototype.unsubscribe = function(channels) {
    channels = utils.ensure(channels);
    for (var i = 0; i < channels.length; i++) {
        channels[i].unsubscribe(this);
    }
};

Session.prototype.send = function(message) {
	process.nextTick(function() {
		io.write(this.__sessionID, JSON.stringify(message));
	}.bind(this));
};

Session.prototype.destroy = function() {
    Session.remove(this.clientID);

    var channels = Channel.getAll();
    for (var i = 0; i < channels.length; i++) {
        if (channels[i].isSubscribed(this)) {
            channels[i].unsubscribe(this);
        }
    }
};
