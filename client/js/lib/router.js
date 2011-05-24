Beseda.Router = function(client) {
    this.client = client;
};

Beseda.Router.prototype.dispatch = function(message) {
    if (message.channel == undefined || 
        message.clientId == undefined || 
        message.id == undefined) {

        this.client.emit('error', 'Beseda receive incorrect message', message);
    } else {
        if (message.channel.indexOf('/meta/') == 0) {
            var metaChannel = message.channel.substr(6);

            if (!metaChannel in ['connect', 'error', 'subscribe', 'unsubscribe']) {
                this.client.emit('error', 'Unsupported meta channel ' + message.channel, message);
            } else {
                this['_' + metaChannel].call(this, message);
            }
        } else if ('successful' in message) {
            this._publish(message);
        } else {
            this._message(message);
        }
    }
};

Beseda.Router.prototype._connect = function(message) {
    if (message.successful) {
        this.client.applyConnection();
        this.client.emit('connect', message);
    } else {
        this.client.disconnect();
        this.client.emit('error', 'Beseda connection request declined', message);
    }
};

Beseda.Router.prototype._error = function(message) {
    this.client.emit('error', message.data, message);
};

Beseda.Router.prototype._subscribe = function(message) {
    if (!message.successful) {
        this.client.emit('error', message.error, message);
    }

    this.client.emit('subscribe', message.error, message);
    this.client.emit('subscribe:' + message.id, message.error, message);
};

Beseda.Router.prototype._unsubscribe = function(message) {
    if (!message.successful) {
        this.client.emit('error', message.error, message);
    }

    this.client.emit('unsubscribe', message.error, message);
    this.client.emit('unsubscribe:' + message.id, message.error, message);
};

Beseda.Router.prototype._publish = function(message) {
    if (!message.successful) {
        this.client.emit('error', message.error, message);
    }

    this.client.emit('message:' + message.id, message.error, message);
    this.client.emit('publish', message.error, message);
};

Beseda.Router.prototype._message = function(message) {
    this.client.emit('message:' + message.channel, message.data, message);
    this.client.emit('message', message.channel, message.data, message);
};
