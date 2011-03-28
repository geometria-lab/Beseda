var Channel             = require('./channel.js'),
    ConnectionRequest   = require('./requests/connection.js'),
	SubscriptionRequest = require('./requests/subscription.js'),
	PublicationRequest  = require('./requests/publication.js');

var sessions = {};

Session = module.exports = function(server, clientId, client) {
    this.server = server;
    this.id     = clientId;
    this.client = client;

	this.client.session = this;

    this.isConnected = false;

    if (sessions[this.id]) {
        throw 'Session ' + this.id + ' already exists.';
    } else {
        sessions[this.id] = this;
    }
}

Session.get = function(id) {
    return sessions[id];
}

Session.getAll = function() {
    return sessions;
}

Session.remove = function(id) {
    delete sessions[id];
}

Session.prototype.connect = function() {
    this.isConnected = true;

    this.session.sendConnectionResponse(true);

    this.log('Session ' + this.id + ' connected!');
}

Session.prototype.requestConnection = function() {
    return new ConnectionRequest(this);
}

Session.prototype.sendConnectionResponse = function(successful, error) {
    this.send([{
        channel    : '/meta/connect',
		clientId   : this.id,
        successful : successful,
        error      : error || ''
    }]);
}

Session.prototype.subscribe = function(channels) {
    for (var channel in channels) {
		channel.subscribe(this);
	}

    this.sendSubscriptionResponse(channels, true);
}

Session.prototype.requestSubscription = function(channels) {
    return new SubscriptionRequest(this, channels);
}

Session.prototype.sendSubscriptionResponse = function(channels, successful, error) {
    var subscription = channels.length == 1 ?
                       channels.map(function(channel) { return channel.name	}) :
                       channels[0];
	this.send([{
        channel      : '/meta/subscribe',
		clientId     : this.id,
        successful   : successful,
        error        : error || '',
        subscription : subscription
    }]);
}

Session.prototype.unsubscribe = function(channel) {
    channel.unsubscribe(this);

    this.send([{
        channel    : '/meta/unsubscribe',
		clientId   : this.id,
        successful : true
    }]);
}

Session.prototype.requestPublication = function(channel) {
    return new PublicationRequest(this, channel);
}

Session.prototype.sendPublicationResponse = function(channel, successful, error) {
	this.send([{
        channel      : channel.name,
		clientId     : this.id,
        successful   : successful,
        error        : error || ''
    }]);
}

Session.prototype.send = function(message) {
    this.client.send(message);
}

Session.prototype.destroy = function() {
    Session.remove(session.id);

    for (var channel in Channel.getAll()) {
        if (channel.isSubscribed(this)) {
            channel.unsubscribe(this);
        }
    }
}