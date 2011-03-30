var Beseda = function(options) {
    this.setOptions({
        socketIO : {
            host : document.location.hostname,
            port : document.location.port || 80
        }
    }, options);

    this._events          = {};
    this._status          = Beseda._statuses.DISCONNECTED;
    this._messageQueue    = [];
    this._forceDisconnect = false;

    this.router   = new Beseda.Router(this);
    this.clientId = Beseda.utils.uid();

    // Setup Socket.io
    if (this.options.socketIO.constructor == Object) {
        var socketOptions = Beseda.utils.cloneObject(this.options.socketIO);

        var host = socketOptions.host;
        delete socketOptions.host;

        this.socketIO = new io.Socket(host, socketOptions);
    } else {
        this.socketIO = this.options.socketIO;
    }

    this.socketIO.on('message', this.router.dispatch.bind(this.router));
    this.socketIO.on('reconnect', this._onReconnect.bind(this));
    this.socketIO.on('disconnect', this._onDisconnect.bind(this));
}

Beseda.prototype.isConnected = function() {
    return this._status == Beseda._statuses.CONNECTED;
}

Beseda.prototype.isDisconnected = function() {
    return this._status == Beseda._statuses.DISCONNECTED;
}

Beseda.prototype.isConnecting = function() {
    return this._status == Beseda._statuses.CONNECTING;
}

Beseda.prototype.subscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    var id = this._sendMessage('/meta/subscribe', message);

    if (callback) {
        this.on('subscribe:' + id, callback);
    }

    return id;
}

Beseda.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        throw 'You must subscribe before :)';
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    var id = this._sendMessage('/meta/unsubscribe', message);

    if (callback) {
        this.on('unsubscribe:' + id, callback);
    }

    return id;
}

Beseda.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var id = this._sendMessage(channel, { data : message });

    if (callback) {
        this.on('message:' + channel + ':' + id, callback);
    }

    return id;
}

Beseda.prototype.connect = function(callback, additionalMessage) {
    if (this.isConnected()) {
        return false;
    }

    this._status = Beseda._statuses.CONNECTING;

    this.socketIO.connect();

    var message = additionalMessage || {};

    this._sendMessage('/meta/connect', message);
}

Beseda.prototype.disconnect = function() {
    this.socketIO.disconnect();
    this._status = Beseda._statuses.DISCONNECTED;
}

Beseda.prototype.setOptions = function(options, extend) {
    this.options = Beseda.utils.mergeObjects(options, extend);
}

Beseda.prototype._sendMessage = function(channel, message) {
    if (this.isDisconnected()) {
        throw 'You must connect before send message';
    }

    message.id       = Beseda.utils.uid();
    message.channel  = channel;
    message.clientId = this.clientId;

    if (this.isConnecting()) {
        this._messageQueue.push(message);
    } else {
        this.socketIO.send([message]);
    }

    return message.id;
}

Beseda.prototype._onReconnect = function() {
    if ('console' in window && !this.listeners('reconnect').length) {
        console.log('Beseda reconnected with ' + this.socketIO.transport.type);
    } else {
        this.emit('reconnect');
    }
}

Beseda.prototype._onDisconnect = function() {
    if (this._forceDisconnect) {
        return;
    }
    if ('console' in window && !this.listeners('disconnect').length) {
        console.log('Beseda disconnected');
    } else {
        this.emit('disconnect');
    }
}

Beseda._statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
}