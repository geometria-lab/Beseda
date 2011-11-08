var channels = {};

Channel = module.exports = function(server, name) {
    this.name = name;
    this._server = server;

    if (channels[name]) {
        throw new Error('Channel ' + name + 'already exists');
    } else {
        channels[name] = this;
    }
};

Channel.prototype.publish = function(message) {
    this._server.pubSub.publish(this.name, message);

    return this;
};

Channel.prototype.addSubscriber = function(session) {
    this._server.subscriptionManager.subscribe(session, this);

    return this;
};

Channel.prototype.hasSubscription = function(session) {
    return this._server.subscriptionManager.hasSubscription(session, this)
}

Channel.prototype.hasSubscriptions = function() {
    return this._server.subscriptionManager.isChannelHasSubscriptions(this);
}

Channel.prototype.removeSubscriber = function(session) {
    this._server.subscriptionManager.unsubscribe(session, this);

    return this;
};

Channel.get = function(name) {
    return channels[name];
};

Channel.getAll = function() {
    return channels;
};

Channel.remove = function(name) {
    delete channels[name];
};