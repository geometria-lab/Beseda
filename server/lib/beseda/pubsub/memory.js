MemoryPubSub = module.exports = function() {
    this.subscriptions = {};
}

MemoryPubSub.subscribe = function(channel, callback) {
    this.subscriptions[channel] = callback;
}

MemoryPubSub.unsubscribe = function(channel) {
    delete this.subscriptions[channel];
}

MemoryPubSub.publish = function(channel, message) {
    var self = this;

    var subscription = this.subscriptions[channel];
    if (subscription) {
        process.nextTick(function() {
            subscription(message);
        });
    }
}