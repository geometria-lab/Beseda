var Session  = require('./session.js'),
    Channel  = require('./channel.js');

var ConnectionRequest     = require('./requests/connection.js'),
    SubscriptionRequest   = require('./requests/subscription.js'),
    PublicationRequest    = require('./requests/publication.js'),
    UnsubscriptionRequest = require('./requests/unsubscription.js');

var utils = require('./utils.js');
var io = require('./io');

MessageRouter = module.exports = function(server) {
    this.server = server;
};

// TODO: Global error emitter.

MessageRouter.prototype.dispatch = function(conectionID, message) {
    if (message.channel == undefined || message.clientId == undefined || message.id == undefined) {
       /* io.write(conectionID, JSON.stringify({
            channel : '/meta/error',
            data    : 'channel, clientId or id not present'
        }));*/

        error();
    }

    if (message.channel.indexOf('/meta/') === 0) {
        var metaChannel = message.channel.substr(6);

        if (!metaChannel in ['connect', 'subscribe', 'unsubscribe']) {
            /*io.write(sessiconectionIDonID, JSON.stringify({
                id       : message.id,
                channel  : '/meta/error',
                clientId : message.clientId,
                data     : 'Meta channel ' + message.channel + ' not supported'
            }));*/

            error();
        }

		// TODO: change swich
        this['_' + metaChannel].call(this, conectionID, message);
    } else if (message.channel.indexOf('/service/') == 0) {
        /*io.write(conectionID, JSON.stringify({
            id       : message.id,
            channel  : '/meta/error',
            clientId : message.clientId,
            data     : 'Service channels not supported'
        }));*/

        error();
    } else if (message.channel.indexOf('/') == 0) {

    
        return this._publish(conectionID, message);
        
    } else {
        /*io.write(conectionID, JSON.stringify({
            id       : message.id,
            channel  : '/meta/error',
            clientId : message.clientId,
            data     : 'Channel name must be start with /'
        }));*/

        error();
    }
};

// TODO: Disconnect after timeout if no one events or connection declined
MessageRouter.prototype._connect = function(conectionID, message) {
    var session = new Session(conectionID);

    //var session = Session.get(message.clientId);
    if (!session) {
    		/*return client.send({
		    id         : message.id,
		    channel    : '/meta/connect',
		    clientId   : message.clientId,
		    successful : false,
		    error      : 'Session ' + message.clientId + ' not present'
		});*/

		error();
    }

    session.connect();

    var request = new ConnectionRequest(session, message);

    var listeners = this.server.listeners('connect');
    if (listeners.length) {
        this.server.emit('connect', request, message);
    } else {
        request.approve();
    }
};

MessageRouter.prototype._subscribe = function(conectionID, message) {
    if (message.subscription == undefined) {
        /*return client.send({
            id           : message.id,
            channel      : '/meta/subscribe',
            clientId     : message.clientId,
            successful   : false,
            subscription : '',
            error        : 'You must have a subscription in your subscribe message'
        });*/

        error();
    }

    var session = Session.get(conectionID);
    if (!session) {
       /* return client.send({
            id           : message.id,
            channel      : '/meta/subscribe',
            clientId     : message.clientId,
            successful   : false,
            subscription : message.subscription,
            error        : 'You must send connection message before'
        });*/

        error();
    }

    //if (session.id != message.clientId) {
    //    throw new Error('Client.session not equal message.clientId');
    //}

    var channels = [];
    var subscriptions = utils.ensure(message.subscription);
    for (var i = 0; i < subscriptions.length; i++) {
        if (subscriptions[i].indexOf('/') != 0) {
            return session.send({
                id           : message.id,
                channel      : '/meta/subscribe',
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Channel name must be start with /'
            });
        }

        if (subscriptions[i].indexOf('/meta/') == 0) {
            return session.send({
                id           : message.id,
                channel      : '/meta/subscribe',
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'You can\'t subscribe to meta channel ' + subscriptions[i]
            });
        }

        if (subscriptions[i].indexOf('*') != -1) {
            return session.send({
                id           : message.id,
                channel      : '/meta/subscribe',
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Wildcards not supported yet'
            });
        }

        var channel = Channel.get(subscriptions[i]);
        if (!channel) {
            channel = new Channel(this.server.pubSub, subscriptions[i]);
        }

        if (channel.isSubscribed(session)) {
            return session.send({
                id           : message.id,
                channel      : '/meta/subscribe',
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

MessageRouter.prototype._unsubscribe = function(conectionID, message) {
    if (message.subscription == undefined) {
        /*return client.send({
            id           : message.id,
            channel      : '/meta/unsubscribe',
            clientId     : message.clientId,
            successful   : false,
            subscription : '',
            error        : 'You must have a subscription in your unsubscribe message'
        });*/
        error();
    }

    var session = Session.get(conectionID);
    if (!session) {
        /*return session.send({
            id           : message.id,
            channel      : '/meta/unsubscribe',
            clientId     : message.clientId,
            successful   : false,
            subscription : message.subscription,
            error        : 'You must send connection message before'
        });*/
    }

    //if (session.id != message.clientId) {
    //    throw new Error('Client.session not equal message.clientId');
    //}

    var channels = [];
    var subscriptions = utils.ensure(message.subscription);
    for (var i = 0; i < subscriptions.length; i++) {
        if (subscriptions[i].indexOf('/') != 0) {
            return session.send({
                id           : message.id,
                channel      : '/meta/unsubscribe',
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Channel name must be start with /'
            });
        }

        if (subscriptions[i].indexOf('*') != -1) {
            return session.send({
                id           : message.id,
                channel      : '/meta/unsubscribe',
                clientId     : message.clientId,
                successful   : false,
                subscription : message.subscription,
                error        : 'Wildcards not supported yet'
            });
        }

        var channel = Channel.get(subscriptions[i]);

        if (!channel || !channel.isSubscribed(session)) {
            return session.send({
                id           : message.id,
                channel      : '/meta/unsubscribe',
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

MessageRouter.prototype._publish = function(conectionID, message) {
    var session = Session.get(conectionID);
    if (!session) {
        /*return client.send({
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            error        : 'You must send connection message before'
        });*/
        error();
    }

    //if (session.id != message.clientId) {
   //     throw new Error('Client.session not equal message.clientId');
    //}

    if (message.channel.indexOf('*') != -1) {
        /*return client.send({
            id           : message.id,
            channel      : message.channel,
            clientId     : message.clientId,
            successful   : false,
            error        : 'Wildcards not supported yet'
        });*/
        error();
    }

    var channel = Channel.get(message.channel);
    if (!channel) {
        channel = new Channel(this.server.pubSub, message.channel);
    }

    var request = new PublicationRequest(session, message, channel);

    var listeners = this.server.listeners('publish');
    if (listeners.length) {
        this.server.emit('publish', request, message);
    } else {
        request.approve();
    }
};

function error() { throw Error(); }
