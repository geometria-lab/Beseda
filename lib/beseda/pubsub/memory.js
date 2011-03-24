MemoryPubSub = module.exports = function() {
    this.exactSubscriptions    = {};
    this.wildcardSubscriptions = {};
}

MemoryPubSub.subscribe = function(channel, callback) {
    var subscription = { callback: callback },
        length       = channel.length;

    if (channel.substr(length - 1, 1) == '*') {
        subscription.channel       = channel.substr(0, length - 1);
        subscription.channelLength = subscription.channel.length;

        this.wildcardSubscriptions[subscription.channel] = subscription;
    } else {
        subscription.channel       = channel;
        subscription.channelLength = length;

        this.exactSubscriptions[subscription.channel] = subscription;
    }
}

MemoryPubSub.unsubscribe = function(channel) {
    var length = channel.length;

    if (channel.substr(length - 1, 1) == '*') {
        channel = channel.substr(0, length - 1);
        delete this.wildcardSubscriptions[channel];
    } else {
        delete this.exactSubscriptions[channel];
    }
}

MemoryPubSub.publish = function(channel, message) {
    var self = this;

    var subscription = this.exactSubscriptions[channel];
    if (subscription) {
        process.nextTick(function() {
            subscription.callback(message);
        });
    }

    var subscription = {};
    var length = channel.length;
    for (var pattern in this.wildcardSubscriptions) {
        subscription = this.wildcardSubscriptions[pattern];
        if (subscription &&
            length >= subscription.length &&
            channel.substr(0, subscription.length) == subscription.channel) {

            process.nextTick(function() {
                subscription.callback(message);
            });
        }
    }
}