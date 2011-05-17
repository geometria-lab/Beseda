var Channel = require('./channel.js');
var utils = require('./utils.js');

var sessions = {};

Session = module.exports = function(server, connectionId) {
	this.server = server;
    this.id = connectionId;

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

Session.prototype.send = function(message) {
	this.server.io.send(this.id, message);
};

Session.prototype.destroy = function() {
    Session.remove(this.id);

    var channels = Channel.getAll();
    for (var i in channels) {
        if (channels[i].isSubscribed(this)) {
            channels[i].unsubscribe(this);
        }
    }
};
