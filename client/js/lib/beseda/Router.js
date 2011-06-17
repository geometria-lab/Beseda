/**
 * @constructor
 */
BesedaPackage.Router = function(client) {
    this.__client = client;
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean, clientId: string }} message
 */
BesedaPackage.Router.prototype.dispatch = function(message) {
    if (message.channel == undefined ||
        message.clientId == undefined ||
        message.id == undefined) {

        this.__client.emit('error', 'Beseda receive incorrect message', message);
    } else {
        if (message.channel.indexOf('/meta/') == 0) {
            var metaChannel = message.channel.substr(6);

            if (!metaChannel in ['connect', 'error', 'subscribe', 'unsubscribe']) {
                this.__client.emit('error', 'Unsupported meta channel ' + message.channel, message);
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

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._connect = function(message) {
    if (message.successful) {
        this.__client.applyConnection();
        this.__client.emit('connect', message);
    } else {
        this.__client.disconnect();
        this.__client.emit('error', 'Beseda connection request declined', message);
    }
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._error = function(message) {
    this.__client.emit('error', message.data, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, success: boolean }} message
 */
BesedaPackage.Router.prototype._subscribe = function(message) {
    if (!message.successful) {
        this.__client.emit('error', message.error, message);
    }

    this.__client.emit('subscribe', message.error, message);
    this.__client.emit('subscribe:' + message.id, message.error, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._unsubscribe = function(message) {
    if (!message.successful) {
        this.__client.emit('error', message.error, message);
    }

    this.__client.emit('unsubscribe', message.error, message);
    this.__client.emit('unsubscribe:' + message.id, message.error, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._publish = function(message) {
    if (!message.successful) {
        this.__client.emit('error', message.error, message);
    }

    this.__client.emit('publish:' + message.id, message.error, message);
    this.__client.emit('publish', message.error, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._message = function(message) {
    this.__client.emit('message:' + message.channel, message.data, message);
    this.__client.emit('message', message.channel, message.data, message);
};
