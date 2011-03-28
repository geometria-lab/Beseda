var Session  = require('./session.js'),
    Channel  = require('./channel.js');

Router = module.exports = function(server) {
    this.server = server;
}

Router.prototype.dispatch = function(client, messages) {
    if (!Array.isArray(messages)) {
        client.send([{
            channel : '/meta/error',
            data    : 'Unsupported data (must be array of messages)'
        }]);
    }

    for (var message in messages) {
        if (message.channel == undefined || message.clientId == undefined) {
            client.send([{
                channel : '/meta/error',
                data    : 'Channel not present'
            }]);

            continue;
        }

        if (message.channel.indexOf('/meta/') == 0) {
            if (!message.channel in ['connect', 'subscribe', 'unsubscribe']) {
                client.send([{
                    channel  : '/meta/error',
					clientId : message.clientId,
                    data     : 'Meta channel ' + message.channel + ' not supported'
                }]);

                continue;
            }
            this['_' + message.channel].call(this, client, message);
        } else if (message.channel.indexOf('/service/') == 0) {
            client.send([{
                channel  : '/meta/error',
				clientId : message.clientId,
                data     : 'Service channels not supported'
            }]);
        } else if (message.channel.indexOf('/') == 0) {
            this._publish(client, message);
        } else {
            client.send([{
                channel  : '/meta/error',
				clientId : message.clientId,
                data     : 'Channel name must be start with /'
            }]);
        }
    }
}

Router.prototype._connect = function(client, message) {
    var session = new Session(this.server, message.clientId, client);

    var listeners = this.server.listeners('connect');
    if (listeners.length > 0) {
        this.server.emit('connect', session.connectionRequest(), message);
    } else {
        session.connect();
    }
}

Router.prototype._subscribe = function(client, message) {
    if (message.subscription == undefined) {
        client.send([{
            channel      : '/meta/subscribe',
			clientId	 : message.clientId,
            successful   : false,
            subscription : '',
            error        : 'You must have a subscription in your subscribe message'
        }]);
    }

    var session = client.session;
    if (!session) {
        client.send([{
            channel      : '/meta/subscribe',
			clientId	 : message.clientId,
            successful   : false,
            subscription : message.subscription,
            error        : 'You must send connection message before'
        }]);
    }

	if (session.id != message.clientId) {
		throw 'Client.session not equal message.clientId';
	}

	var channels = [];
    var subscriptions = this._ensureArray(message.subscription);
    for (var channelName in subscriptions) {
		if (channelName.indexOf('/meta/') == 0) {
			return client.send({
                channel      : '/meta/subscribe',
				clientId	 : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'You can\'t subscribe to meta channel ' + channelName
            });
		}

		// TODO: Support wildcards
		var channel = Channel.get(channelName);
        if (!channel) {
            channel = new Channel(this, channelName);
        }
		channels.push(channel);

		if (channel.isSubscribed(session)) {
            return client.send({
                channel      : '/meta/subscribe',
                successful   : false,
                subscription : message.subscription,
                error        : 'You already subscribed to ' + channelName
            });
        }
	}

	// TODO: Return subscription as is
	var listeners = this.server.listeners('subscribe');
    if (listeners.length > 0) {
    	this.server.emit('subscribe', session.requestSubscription(channels), message);
    } else {
    	session.subscribe(channels);
    }
}

Router.prototype._unsubscribe = function(client, message) {
	if (message.subscription == undefined) {
        client.send([{
            channel      : '/meta/unsubscribe',
			clientId	 : message.clientId,
            successful   : false,
            subscription : '',
            error        : 'You must have a subscription in your unsubscribe message'
        }]);
    }

    var session = client.session;
    if (!session) {
        client.send([{
            channel      : '/meta/unsubscribe',
			clientId	 : message.clientId,
            successful   : false,
            subscription : message.subscription,
            error        : 'You must send connection message before'
        }]);
    }

	if (session.id != message.clientId) {
		throw 'Client.session not equal message.clientId';
	}

	var channels = [];
    var subscriptions = this._ensureArray(message.subscription);
    for (var channelName in subscriptions) {
		if (!channel.isSubscribed(session)) {
            return client.send({
                channel      : '/meta/unsubscribe',
				clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'You not subscribed to ' + channelName
            });
        }
		// TODO: Support wildcards
		var channel = Channel.get(channelName);
        if (!channel) {
            throw 'Can\'t unsubscribe from ' + chanelName + ', becouse channel not present';
        }
		channels.push(channel);
	}

	session.unsubscribe(channels);

	this.server.emit('unsubscribe', session, channels, message);
}

Router.prototype._publish = function(client, message) {
	var session = client.session;
	if (!session) {
		client.send([{
            channel      : message.channel,
			clientId	 : message.clientId,
            successful   : false,
            error        : 'You must send connection message before'
        }]);
	}

	if (session.id != message.clientId) {
		throw 'Client.session not equal message.clientId';
	}

	var channel = Channel.get(message.channel);
	if (!channel) {
		channel = new Channel(this.server, message.channel);
	}
	
	var listeners = this.server.listeners('publish');
    if (listeners.length > 0) {
    	this.server.emit('publish', session.requestPublication(channel), message);
    } else {
    	channel.publish(message);
		session.sendPublicationResponse(channel, true);
    }
}

Router.prototype._ensureArray = function(array) {
	return Array.isArray(array) ? array : [ array ];
}