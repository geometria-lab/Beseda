var redis = require('redis');
var utils = require('./../utils.js');

RedisPubSub = module.exports = function(options) {
    this.options = utils.merge({
        host    : '127.0.0.1',
        port    : 6379,
        options : {}
    }, options);

    this.clientPublish   = redis.createClient(this.options.port, this.options.host, this.options.options);
    this.clientSubscribe = redis.createClient(this.options.port, this.options.host, this.options.options);

    this.clientPublish.on('error', this._oneConnectionError.bind(this));
    this.clientSubscribe.on('error', this._oneConnectionError.bind(this));

	this.clientSubscribe.on('message', this._onMessage.bind(this));
}

RedisPubSub.prototype.setSubscriptionManager = function(subscriptionManager) {
	this._subscriptionManager = subscriptionManager;
}

RedisPubSub.prototype.subscribe = function(channel) {
    this.clientSubscribe.subscribe(channel);
}

RedisPubSub.prototype.unsubscribe = function(channel) {
    this.clientSubscribe.unsubscribe(channel);
}

RedisPubSub.prototype.publish = function(channel, message) {
    this.clientPublish.publish(channel, JSON.stringify(message));
}

RedisPubSub.prototype._onMessage = function(channel, message) {
    this._subscriptionManager.deliverMessage(channel, JSON.parse(message));
}

RedisPubSub.prototype._oneConnectionError = function(error) {
    throw new Error('Can\'t connect to redis ' + this.options.host + ':' + this.options.port + ' ' + error);
}