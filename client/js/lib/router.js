Beseda.Router = function(client) {
    this.client = client;
}

Beseda.Router.prototype.dispatch = function(message) {
    if (message.channel.indexOf('/meta/') == 0) {
        var metaChannel = message.channel.substr(6);
        if (!metaChannel in ['connect', 'error', 'subscribe', 'unsubscribe']) {
            this._triggerError('Unsupported meta channel ' + message.channel);
        }

        this['_' + metaChannel].call(this, message);
    } else {
        this._message(message);
    }
}

Beseda.Router.prototype._connect = function(message) {
    if (message.successful) {
        this.client._status = Beseda._statuses.CONNECTED;
        this.client.socketIO.send(this.client._messageQueue);
        this.client._messageQueue = [];
    } else {
        this.client._status = Beseda._statuses.DISCONNECTED;
        this.client._forceDisconnect = true;
        this.socketIO.disconnect();
        this.client._forceDisconnect = false;
        this.client._messageQueue = [];

        this._triggerError('Can\'t connect: ' + message.error);
    }

    this.client.emit('connection', message);
}

Beseda.Router.prototype._error = function(message) {
    this._triggerError(message.error);
}

Beseda.Router.prototype._subscribe = function(message) {
    if (!message.successful) {
        this._triggerError('Can\'t subscribe: ' + message.error);
    }

    this.client.emit('subscribe', message.error, message);
    this.client.emit('subscribe:' + message.id, message.error, message);
}

Beseda.Router.prototype._unsubscribe = function(message) {
    if (!message.successful) {
        this._triggerError('Can\'t unsubscribe: ' + message.error);
    }

    this.client.emit('unsubscribe', message.error, message);
    this.client.emit('unsubscribe:' + message.id, message.error, message);
}

Beseda.Router.prototype._message = function(message) {
    if ('successful' in message) {
        this.client.emit('message:' + message.channel + ':' + message.id, message.error, message);

        if (!message.successful) {
            this._triggerError('Can\'t publish: ' + message.error);
        }
    } else {
        this.client.emit('message:' + message.channel, message.data, message);
        this.client.emit('message', message.channel, message.data, message);
    }
}

Beseda.Router.prototype._triggerError = function(error) {
    if ('console' in window && !this.client.listeners('error').length) {
        console.log('Beseda error: ' + error);
    } else {
        this.client.emit('error', error);
    }
}