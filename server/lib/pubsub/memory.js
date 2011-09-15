MemoryPubSub = module.exports = function() {
    this._subscriptions = {};
};

MemoryPubSub.prototype.setSubscriptionManager = function(subscriptionManager) {
	this._subscriptionManager = subscriptionManager;
};

MemoryPubSub.prototype.subscribe = function(channel) {
    this._subscriptions[channel] = true;
};

MemoryPubSub.prototype.unsubscribe = function(channel) {
    delete this._subscriptions[channel];
};

MemoryPubSub.prototype.publish = function(channel, message) {
    var subscription = this._subscriptions[channel];

    if (subscription) {
		this._subscriptionManager.deliverMessage(channel, message);
    }
};