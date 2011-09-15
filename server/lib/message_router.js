var Session  = require('./session.js'),
    Channel  = require('./channel.js');

var ConnectionRequest     = require('./requests/connection.js'),
    SubscriptionRequest   = require('./requests/subscription.js'),
    PublicationRequest    = require('./requests/publication.js'),
    UnsubscriptionRequest = require('./requests/unsubscription.js');

var utils = require('./utils.js');
var util = require('util');

MessageRouter = module.exports = function(server) {
    this.server = server;
};

MessageRouter.prototype.dispatch = function(connectionId, messages) {
	var i = 0,
		l = messages.length;

	while (i < l) {
		this._doDispatch(connectionId, messages[i]);
		i++;
	}
};

MessageRouter.prototype._doDispatch = function(connectionId, message) {
    if (message.channel  === undefined ||
        message.clientId === undefined || 
        message.id       === undefined) {
        
        return this.server.io.send(connectionId, {
            channel : '/meta/error',
            data    : 'channel, clientId or id not present'
        });
    }

    if (message.channel.indexOf('/meta/') === 0) {
        var metaChannel = message.channel.substr(6);

        if (!metaChannel in ['connect', 'subscribe', 'unsubscribe']) {
            this.server.io.send(connectionId, {
                id       : message.id,
                channel  : '/meta/error',
                clientId : message.clientId,
                data     : 'Meta channel ' + message.channel + ' not supported'
            });
        }

        this['_' + metaChannel].call(this, connectionId, message);
    } else if (message.channel.indexOf('/service/') === 0) {
        this.server.io.send(connectionId, {
            id       : message.id,
            channel  : '/meta/error',
            clientId : message.clientId,
            data     : 'Service channels not supported'
        });
    } else if (message.channel.indexOf('/') === 0) {
        return this._publish(connectionId, message);
    } else {
        this.server.io.send(connectionId, {
            id       : message.id,
            channel  : '/meta/error',
            clientId : message.clientId,
            data     : 'Channel name must be start with /'
        });
    }
};

MessageRouter.prototype._connect = function(connectionId, message) {
    var session = Session.get(connectionId);
	if (!session) {
        var session = new Session(this.server, connectionId),
            request = new ConnectionRequest(session, message),
            listeners = this.server.listeners('connect');
		if (listeners.length) {
		    this.server.emit('connect', request, message);
		} else {
		    request.approve();
		}
	}
};

MessageRouter.prototype._subscribe = function(connectionId, message) {
    if (message.subscription == undefined) {
        return this.server.io.send({
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            subscription : '',
            error        : 'You must have a subscription in your subscribe message'
        });
    }

    var session = Session.get(connectionId);
    if (!session) {
        return this.server.io.send({
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            subscription : message.subscription,
            error        : 'You must send connection message before'
        });
    }

    if (connectionId != message.clientId) {
        return session.send({
            id         : message.id,
            channel    : message.channel,
            clientId   : message.clientId,
            successful : false,
            error      : 'Invalid client id'
        });
    }

    var channels = [];
    var subscriptions = utils.ensureArray(message.subscription);
    for (var i = 0; i < subscriptions.length; i++) {
        if (subscriptions[i].indexOf('/') != 0) {
            return session.send({
                id           : message.id,
                channel      : message.channel,
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Channel name must be start with /'
            });
        }

        if (subscriptions[i].indexOf('/meta/') == 0) {
            return session.send({
                id           : message.id,
                channel      : message.channel,
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'You can\'t subscribe to meta channel ' + subscriptions[i]
            });
        }

        if (subscriptions[i].indexOf('*') != -1) {
            return session.send({
                id           : message.id,
                channel      : message.channel,
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Wildcards not supported yet'
            });
        }

        var channel = Channel.get(subscriptions[i]);
        if (!channel) {
            channel = new Channel(this.server, subscriptions[i]);
        }

        if (session.isSubscribed(channel)) {
            return session.send({
                id           : message.id,
                channel      : message.channel,
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'You already subscribed to ' + subscriptions[i]
            });
        }

        channels.push(channel);
    }

    var request = new SubscriptionRequest(session, message, channels);

    var listeners = this.server.listeners('subscribe');
    if (listeners.length) {
        this.server.emit('subscribe', request, message);
    } else {
        request.approve();
    }
};

MessageRouter.prototype._unsubscribe = function(connectionId, message) {
    var session = Session.get(connectionId);
    if (!session) {
        return this.server.io.send(connectionId, {
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            subscription : message.subscription,
            error        : 'You must send connection message before'
        });
    }

    if (message.subscription == undefined) {
        return session.send({
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            subscription : '',
            error        : 'You must have a subscription in your unsubscribe message'
        });
    }

    if (connectionId != message.clientId) {
        return session.send({
            id         : message.id,
            channel    : message.channel,
            clientId   : message.clientId,
            successful : false,
            error      : 'Invalid client id'
        });
    }

    var channels = [];
    var subscriptions = utils.ensureArray(message.subscription);
    for (var i = 0; i < subscriptions.length; i++) {
        if (subscriptions[i].indexOf('/') != 0) {
            return session.send({
                id           : message.id,
                channel      : message.channel,
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Channel name must be start with /'
            });
        }

        if (subscriptions[i].indexOf('*') != -1) {
            return session.send({
                id           : message.id,
                channel      : message.channel,
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Wildcards not supported yet'
            });
        }

        var channel = Channel.get(subscriptions[i]);

        if (!channel || !session.isSubscribed(channel)) {
            return session.send({
                id           : message.id,
                channel      : message.channel,
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'You not subscribed to ' + subscriptions[i]
            });
        }

        channels.push(channel);
    }

    var request = new UnsubscriptionRequest(session, message, channels);

    var listeners = this.server.listeners('unsubscribe');
    if (listeners.length) {
        this.server.emit('unsubscribe', request, message);
    } else {
        request.approve();
    }
};

MessageRouter.prototype._publish = function(connectionId, message) {
    var session = Session.get(connectionId);

    if (!session) {
        this.server.io.send(connectionId, {
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            error        : 'You must send connection message before'
        });
    }

    if (connectionId != message.clientId) {
        return session.send({
            id         : message.id,
            channel    : message.channel,
            clientId   : message.clientId,
            successful : false,
            error      : 'Invalid client id'
        });
    }

    if (message.channel.indexOf('*') != -1) {
        return session.send({
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            error        : 'Wildcards not supported yet'
        });
    }

    var channel = Channel.get(message.channel);
    if (!channel) {
        channel = new Channel(this.server, message.channel);
    }

    var request = new PublicationRequest(session, message, channel);

    var listeners = this.server.listeners('publish');
    if (listeners.length) {
        this.server.emit('publish', request, message);
    } else {
        request.approve();
    }
};
