MemoryPubSub = module.exports = function() {
    this.subscriptions = {};
};

MemoryPubSub.prototype.subscribe = function(channel, callback) {
    this.subscriptions[channel] = callback;
};

MemoryPubSub.prototype.unsubscribe = function(channel) {
    delete this.subscriptions[channel];
};

MemoryPubSub.prototype.publish = function(channel, message) {
    var subscription = this.subscriptions[channel];
    
    if (subscription) {
        subscription(channel, message);
    }
};
