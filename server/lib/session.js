var Channel = require('./channel');
var utils = require('./utils');
var io = require('./io');

var sessions = {};

Session = module.exports = function(connectionID) {
    //this.server = server;
    //this.clientID     = clientId;
    this.connectionID = connectionID;

    this.isConnected = false;

	this.connectedTimestamp = 0;
    this.createdTimestamp = Date.now();

    if (sessions[this.connectionID]) {
        throw new Error('Session with connection ' + this.connectionID + ' already exists.');
    } else {
        sessions[this.connectionID] = this;
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
	io.write(this.connectionID, JSON.stringify(message));
};

Session.prototype.destroy = function() {
    Session.remove(this.connectionID);

    var channels = Channel.getAll();
    for (var i = 0; i < channels.length; i++) {
        if (channels[i].isSubscribed(this)) {
            channels[i].unsubscribe(this);
        }
    }
};
