var Channel = require('./channel.js');

var utils = require('./utils.js');

var util = require('util');

module.exports = SubscriptionManager = function(server) {
    this._server = server;

    this._channelsToSessions = {};
    this._sessionsToChannels = {};
}

SubscriptionManager.prototype.subscribe = function(session, channel) {
    if (this.hasSubscription(session, channel)) {
        throw new Error('Session ' + session.id + ' already subscribed to channel ' + channel.name);
    }

    // Add session to channel
    if (!this._channelsToSessions[channel.name]) {
        this._channelsToSessions[channel.name] = {};

        this._server.pubSub.subscribe(channel.name);
    }
    this._channelsToSessions[channel.name][session.id] = session;

    // Add channel to session
    if (!this._sessionsToChannels[session.id]) {
        this._sessionsToChannels[session.id] = {};
    }
    this._sessionsToChannels[session.id][channel.name] = channel;
}

SubscriptionManager.prototype.hasSubscription = function(session, channel) {
    return this._channelsToSessions[channel.name] &&
	       this._channelsToSessions[channel.name][session.id];
}

SubscriptionManager.prototype.isChannelHasSubscriptions = function(channel) {
    return !!this._channelsToSessions[channel.name];
}

SubscriptionManager.prototype.unsubscribe = function(session, channel) {
    if (!this.hasSubscription(session, channel)) {
        throw new Error('Session ' + session.id + ' not subscribed to channel ' + channel.name);
    }

    // Remove from channels
    delete this._channelsToSessions[channel.name][session.id];
    if (utils.isObjectEmpty(this._channelsToSessions[channel.name])) {
        this._server.pubSub.unsubscribe(channel.name);

        delete this._channelsToSessions[channel.name];
        Channel.remove(channel.name);
    }

    // Remove from sessions
    delete this._sessionsToChannels[session.id][channel.name];

    if (utils.isObjectEmpty(this._sessionsToChannels[session.id])) {
        delete this._sessionsToChannels[session.id];
    }
}

SubscriptionManager.prototype.unsubscribeFromAll = function(session) {
    for (var channelName in this._sessionsToChannels[session.id]) {
        var channel = this._sessionsToChannels[session.id][channelName];
        this.unsubscribe(session, channel);
    }
}

SubscriptionManager.prototype.deliverMessage = function(channel, message) {
	var count = 0;

    for (var sessionId in this._channelsToSessions[channel]) {
		this._channelsToSessions[channel][sessionId].send(message);

	    count++
    }

    this._server.log('Receive new message from "' + channel + '" and deliver to ' + count + ' subscribers');
}