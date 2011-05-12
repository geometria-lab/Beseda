var Channel = require('./channel.js');
var utils = require('./utils.js');
var io = require('./io');

var sessions = {};

Session = module.exports = function(server, id) {
	this.server = server;
    this.id = id;

    this.isConnected = false;

	this.connectedTimestamp = 0;
    this.createdTimestamp = Date.now();

    if (sessions[this.id]) {
        throw new Error('Session with connection ' + this.id + ' already exists.');
    } else {
        sessions[this.id] = this;
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

Session.prototype.send = function(message) {
	this.server.io.send(this.id, JSON.stringify(message));
};

Session.prototype.destroy = function() {
    Session.remove(this.id);

    var channels = Channel.getAll();
    for (var i = 0; i < channels.length; i++) {
        if (channels[i].isSubscribed(this)) {
            channels[i].unsubscribe(this);
        }
    }
};
