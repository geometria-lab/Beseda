var sessions = {};

Session = module.exports = function(server, connectionId) {
    this.server = server;
    this.id     = connectionId;

    sessions[this.id] = this;
};

Session.prototype.subscribe = function(channel) {
    this.server.subscriptionManager.subscribe(this, channel);
};

Session.prototype.isSubscribed = function(channel) {
    return this.server.subscriptionManager.hasSubscription(this, channel)
}

Session.prototype.unsubscribe = function(channel) {
    this.server.subscriptionManager.unsubscribe(this, channel);
};

Session.prototype.send = function(message) {
	this.server.io.send(this.id, message);
};

Session.prototype.destroy = function() {
    this.server.subscriptionManager.unsubscribeFromAll(this);
    Session.remove(this.id);
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
