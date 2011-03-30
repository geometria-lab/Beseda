var Channel = require('./channel.js');

require('./utils.js');

var sessions = {};

Session = module.exports = function(server, clientId, client) {
    this.server = server;
    this.id     = clientId;
    this.client = client;

    this.client.session = this;

    this.isConnected = false;

    if (sessions[this.id]) {
        throw 'Session ' + this.id + ' already exists.';
    } else {
        sessions[this.id] = this;
    }
}

Session.get = function(id) {
    return sessions[id];
}

Session.getAll = function() {
    return sessions;
}

Session.remove = function(id) {
    delete sessions[id];
}

Session.prototype.connect = function() {
    this.isConnected = true;

    this.log('Session ' + this.id + ' connected!');
}

Session.prototype.subscribe = function(channels) {
    channels = Array.ensure(channels);
    for (var channel in channels) {
        channel.subscribe(this);
    }
}

Session.prototype.unsubscribe = function(channels) {
    channels = Array.ensure(channels);
    for (var channel in channels) {
        channel.unsubscribe(this);
    }
}

Session.prototype.send = function(message) {
    this.client.send(message);
}

Session.prototype.destroy = function() {
    Session.remove(this.id);

    var channels = Channel.getAll();

    for (var channel in channels) {
        if (channel.isSubscribed(this)) {
            channel.unsubscribe(this);
        }
    }
}