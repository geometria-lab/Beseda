// TODO: Needs channels clenup!
var channels = {};

Channel = module.exports = function(server, name) {
    this.server = server;
    this.name   = name;
    this.subscriptions = {};

    this._isConnectedToPubSub = false;

    if (channels[name]) {
        throw 'Channel ' + name + 'already exists';
    } else {
        channels[name] = name;
    }
}

Channel.get = function(name) {
    return channels[name]
}

Channel.getAll = function() {
    return channels;
}

Channel.prototype.publish = function(message) {
    this.server.pubSub.publish(this.name, message);
}

Channel.prototype.subscribe = function(session) {
    if (this.isSubscribed[session]) {
        throw 'Session ' + session.id + ' already subscribed to channel ' + this.name;
    }

    this.subscriptions[session.id] = session;

    if (!this._isConnectedToPubSub) {
        this.server.pubSub.subscribe(this.name, this._deliverMessage.bind(this));
        this._isConnectedToPubSub = true;
    }
}

Channel.prototype.isSubscribed = function(session){
    return !!this.subscriptions[session.id]
}

Channel.prototype.unsubscribe = function(session) {
    if (!this.isSubscribed[session]) {
        throw 'Session ' + session.id + ' not subscribed to channel ' + this.name;
    }

    delete this.subscriptions[session.id];

    if (!this.subscriptions.length) {
        this.server.pubSub.unsubscribe(this.name);
        this._isConnectedToPubSub = false;
    }
}

Channel.prototype._deliverMessage = function(message) {
    for (var sessionId in this.subscriptions) {
        this.subscriptions[sessionId].send(message);
    }
}