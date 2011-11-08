var util = require('util');

module.exports = Router = function(client) {
    this.client = client;
};

Router.prototype.dispatch = function(message) {
    if (message.channel == undefined || message.clientId == undefined || message.id == undefined) {
        this.client.emit('error', 'Receive incorrect message', message);
    } else {
        if (message.channel.indexOf('/meta/') == 0) {
            var metaChannel = message.channel.substr(6);
            
            if (!metaChannel in ['connect', 'error', 'subscribe', 'unsubscribe']) {
                //this.client.log('Unsupported meta channel ' + message.channel);
                this.client.emit('error', 'Unsupported meta channel ' + message.channel, message);
            } else {
                this['_' + metaChannel](message);
            }
        } else {
            this._message(message);
        }
    }
};

Router.prototype._connect = function(message) {
    if (message.successful) {
        this.client._status = Client._statuses.CONNECTED;
	    
        this.client.flushMessageQueue();
   		this.client.emit('connection', message);
    } else {
        this.client.disconnect();

        this.client.emit('error', 'Connection request declined', message);
    }
};

Router.prototype._error = function(message) {
    this.client.emit('error', message.error, message);
};

Router.prototype._subscribe = function(message) {
    if (message.successful) {
        //this.client.log('Beseda subscribed to ' + message.subscription, message);
    } else {
        this.client.emit('error', 'Beseda subscribe request declined', message);
    }

    this.client.emit('subscribe', message.error, message);
    this.client.emit('subscribe:' + message.id, message.error, message);
};

Router.prototype._unsubscribe = function(message) {
    if (message.successful) {
        //this.client.log('Beseda unsubscribed from ' + message.subscription.toString(), message);
    } else {
        this.client.emit('error', 'Beseda unsubscribe request declined', message);
    }

    this.client.emit('unsubscribe', message.error, message);
    this.client.emit('unsubscribe:' + message.id, message.error, message);
};

Router.prototype._message = function(message) {
    if ('successful' in message) {
        this.client.emit('message:' + message.id, message.error, message);

        if (!message.successful) {
            this.client.emit('error', 'Beseda publish request declined', message);
        }
    } else {
        //this.client.log('Beseda get a new message from ' + message.channel, message);

        this.client.emit('message:' + message.channel, message.data, message);
        this.client.emit('message', message.channel, message.data, message);
    }
};
