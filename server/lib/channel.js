// TODO: Needs empty channels cleanup by timestamp?
var channels = {};

Channel = module.exports = function(server, name) {
    this.server = server;
    this.name   = name;
    this.subscriptions = {};

    this.createdTimestamp = Date.now();
    this.receivedTimestamp = null;
    this.receivedCount = 0;
    this.publishedTimestamp = null;
    this.publishedCount = 0;

    this._isConnectedToPubSub = false;

    if (channels[name]) {
        throw new Error('Channel ' + name + 'already exists');
    } else {
        channels[name] = this;
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

    this.publishedTimestamp = Date.now();
    this.publishedCount++;
}

Channel.prototype.subscribe = function(session) {
    if (this.isSubscribed[session]) {
        throw new Error('Session ' + session.id + ' already subscribed to channel ' + this.name);
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
    if (!this.isSubscribed(session)) {
        throw new Error('Session ' + session.id + ' not subscribed to channel ' + this.name);
    }

    delete this.subscriptions[session.id];

    if (!this.subscriptions.length) {
        this.server.pubSub.unsubscribe(this.name);
        this._isConnectedToPubSub = false;
    }
}

Channel.prototype._deliverMessage = function(message) {
    var count = 0;
    for (var sessionId in this.subscriptions) {
        if (this.subscriptions.hasOwnProperty(sessionId)) {
            count++;
            this.subscriptions[sessionId].send(message);
        }
    }

    this.receivedTimestamp = Date.now();
    this.receivedCount++;

    this.server.log('Receive new message to "' + this.name + '" and deliver to ' + count + ' subscribers');
}