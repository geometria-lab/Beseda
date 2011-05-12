var redis = require('redis-node');

require('./../utils.js');

RedisPubSub = module.exports = function(options) {
    this.options = utils.merge({
        host    : '127.0.0.1',
        port    : 6379,
        options : {}
    }, options);

    this.clientPublish   = redis.createClient(this.options.port, this.options.host, this.options.options);
    this.clientSubscribe = redis.createClient(this.options.port, this.options.host, this.options.options);
    
    this.clientPublish.on('connection error', this._oneConnectionError.bind(this));
    this.clientSubscribe.on('connection error', this._oneConnectionError.bind(this));
}

RedisPubSub.prototype.subscribe = function(channel, callback) {
    this.clientSubscribe.subscribeTo(channel, function(channel, message) {
        callback(JSON.parse(message));
    });
}

RedisPubSub.prototype.unsubscribe = function(channel) {
    this.clientSubscribe.unsubscribeFrom(channel);
}

RedisPubSub.prototype.publish = function(channel, message) {
    this.clientPublish.publish(channel, JSON.stringify(message));
}

RedisPubSub.prototype._oneConnectionError = function(error) {
    throw new Error('Can\'t connect to redis ' + this.options.host + ':' + this.options.port + ' ' + error);
}