var Channel = require('./channel.js');
var utils = require('./utils.js');

var sessions = {};

Session = module.exports = function(server, clientId, client) {
    this.server = server;
    this.id     = clientId;
    this.client = client;

    this.client.session = this;

    this.createdTimestamp = Date.now();

    if (sessions[this.id]) {
        throw new Error('Session ' + this.id + ' already exists.');
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

Session.prototype.subscribe = function(channels) {
    channels = utils.ensure(channels);
    for (var i = 0; i < channels.length; i++) {
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
    this.client.send(JSON.stringify(message));
};

Session.prototype.destroy = function() {
    delete this.client.session;

    Session.remove(this.id);

    var channels = Channel.getAll();
    for (var i = 0; i < channels.length; i++) {
        if (channels[i].isSubscribed(this)) {
            channels[i].unsubscribe(this);
        }
    }
};