Beseda.Router = function(client) {
    this.client = client;
};

Beseda.Router.prototype.dispatch = function(message) {
    if (message.channel == undefined || message.clientId == undefined || message.id == undefined) {
        this.client.log('Beseda receive incorrect message', message);
        this.client.emit('error', message);
    } else {
        if (message.channel.indexOf('/meta/') == 0) {
            var metaChannel = message.channel.substr(6);
            if (!metaChannel in ['connect', 'error', 'subscribe', 'unsubscribe']) {
                this.client.log('Unsupported meta channel ' + message.channel);
                this.client.emit('error', message);
            }

            this['_' + metaChannel].call(this, message);
        } else {
            this._message(message);
        }
    }
};

Beseda.Router.prototype._connect = function(message) {
    if (message.successful) {
        this.client._status = Beseda._statuses.CONNECTED;

        this.client.flushMessageQueue();

        this.client.log('Beseda connected');
        
   		this.client.emit('connection', message);
    } else {
        this.client.disconnect();

        this.client.log('Beseda connection request declined', message);
        
        this.client.emit('error', message);
    }
};

Beseda.Router.prototype._error = function(message) {
    this.client.log('Beseda error: ' + message.data);
    this.client.emit('error', message);
};

Beseda.Router.prototype._subscribe = function(message) {
    if (message.successful) {
        this.client.log('Beseda subscribed to ' + message.subscription.toString(), message);
    } else {
        this.client.log('Beseda subscribe request declined', message);
        this.client.emit('error', message);
    }

    this.client.emit('subscribe', message.error, message);
    this.client.emit('subscribe:' + message.id, message.error, message);
};

Beseda.Router.prototype._unsubscribe = function(message) {
    if (message.successful) {
        this.client.log('Beseda unsubscribed from ' + message.subscription.toString(), message);
    } else {
        this.client.log('Beseda unsubscribe request declined', message);
        this.client.emit('error', message);
    }

    this.client.emit('unsubscribe', message.error, message);
    this.client.emit('unsubscribe:' + message.id, message.error, message);
};

Beseda.Router.prototype._message = function(message) {
    if ('successful' in message) {
        this.client.emit('message:' + message.channel + ':' + message.id, message.error, message);

        if (message.successful) {
            this.client.log('Beseda publish to ' + message.channel, message);
        } else {
            this.client.log('Beseda publish request declined', message);
            this.client.emit('error', message);
        }
    } else {
        this.client.log('Beseda get a new message from ' + message.channel, message);

        this.client.emit('message:' + message.channel, message.data, message);
        this.client.emit('message', message.channel, message.data, message);
    }
};
