//var redis = require('./../../../vendor/redis-client.js');
var redis = require('redis-node');

var Channel = require('./../channel.js');

var sys = require('sys');

RedisPubSub = module.exports = function(options) {
    this.options = options;

    this.clientPublish   = redis.createClient(options.port, options.host, options.options);
    this.clientSubscribe = redis.createClient(options.port, options.host, options.options);
    this.clientPublish.on('error', this._oneConnectionError.bind(this));
    this.clientSubscribe.on('error', this._oneConnectionError.bind(this));
/*
    this.clientSubscribe.on('message', function(channelName, message) {
        var channel = Channel.get(channel);
        if (!channel) {
            throw 'Channel not found';
        }
        channel.deliverMessage(message);
    });
    */
}

RedisPubSub.prototype.subscribe = function(channel, callback) {
    this.clientSubscribe.subscribeTo(channel, function(channel, message) {
        if (channel) {
            callback.call(message);
        }


        sys.log(channel + ': ' + message);
        //callback.call(message.toString('utf8'));

        //callback(message.toString('utf8'));
    });
}

RedisPubSub.prototype.unsubscribe = function(channel) {
    this.clientSubscribe.unsubscribeFrom(channel);
}

RedisPubSub.prototype.publish = function(channel, message) {
    this.clientPublish.publish(channel, JSON.stringify(message));
}

RedisPubSub.prototype._oneConnectionError = function(error) {
    throw 'RedisPubSub error: ' + error;

    //throw 'Can\'t connect to redis: ' + this.options.host + ':' + this.options.port;
}