var Session  = require('./session'),
    Channel  = require('./channel');

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

    for (message in messages) {
        if (message.channel == undefined) {
            client.send([{
                channel : '/meta/error',
                data    : 'Channel not present'
            }]);

            continue;
        }

        if (message.channel.indexOf('/meta/') == 0) {
            if (!message.channel in ['connect', 'subscribe', 'unsubscribe']) {
                client.send([{
                    channel : '/meta/error',
                    data    : 'Meta channel ' + message.channel + ' not supported'
                }]);

                continue;
            }
            this['_' + message.channel].call(this, client, message);
        } else if (message.channel.indexOf('/service/') == 0) {
            client.send([{
                channel : '/meta/error',
                data    : 'Service channels not supported'
            }]);
        } else if (message.channel.indexOf('/') == 0) {
            this._publish(client, message);
        } else {
            client.send([{
                channel : '/meta/error',
                data    : 'Channel name must be start with /'
            }]);
        }
    }
}

Router.prototype._connect = function(client, message, response) {
    var session = new Session(this, client);

    var listeners = this.listeners('connection');
    if (listeners.length > 0) {
        this.emit('connection', session.connectionRequest(), message);
    } else {
        session.connect();
    }
}

Router.prototype._subscribe = function(client, message, response) {
    if (message.subscription == undefined) {
        client.send([{
            channel      : '/meta/subscribe',
            successful   : false,
            subscription : '',
            error        : 'You must have a subscription in your subscribe message'
        }]);
    }

    var session = Session.get(client.session_id);
    if (!session) {
        client.send([{
            channel      : '/meta/subscribe',
            successful   : false,
            subscription : message.subscription,
            error        : 'You must send connection message before'
        }]);
    }

    var subscriptions = Array.isArray(message.subscription) ? message.subscription : [ message.subscription ];
    for (channelName in subscriptions) {
        var channel = Channel.get(channelName);

        if (!channel) {
            channel = new Channel(this, channelName);
        }

        if (channel.isSubscribed(session)) {
            client.send({
                channel      : '/meta/subscribe',
                successful   : false,
                subscription : message.subscription,
                error        : 'You already subscribed to ' + channelName
            });
        }

        var listeners = this.listeners('subscription');
        if (listeners.length > 0) {
            this.emit('subscription', session.subscriptionRequest(channel, message), message);
        } else {
            session.subscribe(channel);
        }
    }
}

Router.prototype._unsubscribe = function(client, message, response) {

}

Router.prototype._publish = function(client, message, response) {

}