var redis = require('redis');

RedisPubSub = module.exports = function(options) {
    this.clientSubscribe = redis.createClient(options.port, options.host, options.options);
    this.clientPublish   = redis.createClient(options.port, options.host, options.options);
}

RedisPubSub.prototype.subscribe = function(channel, callback) {
    this.clientSubscribe.subscribeTo(channel, function(channel, message, error) {
        if (error) {
            throw error;
        }
        if (channel) {
            callback(JSON.parse(message));
        }
    });
}

RedisPubSub.prototype.unsubscribe = function(channel) {
    this.clientSubscribe.unsubscribeFrom(channel, function(error) {
        if (error) {
            throw error;
        }
    }.bind(this));
}

RedisPubSub.prototype.publish = function(channel, message) {
    this.clientPublish.publish(channel, JSON.stringify(message), function(error, recipientCount) {
        if (error) {
            throw error;
        }
    });
}