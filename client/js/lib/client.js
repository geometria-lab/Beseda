// TODO: Reconnect? and update subscribes on server when it down and up

var Beseda = function(options) {
    this.setOptions({
        socketIO : {
            host : document.location.hostname,
            port : document.location.port || 80
        },
        log : function() {
            if ('console' in window && 'log' in console) {
                console.log.apply(console, arguments);
            }
        }
    }, options);

    this._events       = {};
    this._status       = Beseda._statuses.DISCONNECTED;
    this._messageQueue = [];

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

    var self = this;
    this.socketIO.on('message', function(message) {
        self.router.dispatch(message);
    });
    this.socketIO.on('reconnect', function(){
        self._onReconnect();
    });
    this.socketIO.on('disconnect', function(){
        self._onDisconnect();
    });
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

    message = this._sendMessage('/meta/subscribe', message);

    this.log('Beseda send subscribe request', message);

    if (callback) {
        this.on('subscribe:' + message.id, callback);
    }

    return this;
}

Beseda.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/unsubscribe', message);

    this.log('Beseda send unsubscribe request', message);

    if (callback) {
        this.on('unsubscribe:' + message.id, callback);
    }

    return this;
}

Beseda.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this._sendMessage(channel, { data : message });

    this.log('Beseda send publish request', message);

    if (callback) {
        this.on('message:' + channel + ':' + message.id, callback);
    }

    return this;
}

Beseda.prototype.connect = function(callback, additionalMessage) {
    if (this.isConnected()) {
        return false;
    }

    this._status = Beseda._statuses.CONNECTING;

    this.socketIO.connect();

    var message = this._createMessage('/meta/connect', additionalMessage);

    this.socketIO.send(message);

    this.log('Beseda send connection request', message);

    return this;
}

Beseda.prototype.disconnect = function() {
    this.socketIO.disconnect();
}

Beseda.prototype.setOptions = function(options, extend) {
    this.options = Beseda.utils.mergeObjects(options, extend);
}

Beseda.prototype.log = function() {
    this.options.log.apply(this, arguments);
}

Beseda.prototype._sendMessage = function(channel, message) {
    if (this.isDisconnected()) {
        throw 'You must connect before send message';
    }

    message = this._createMessage(channel, message);

    if (this.isConnecting()) {
        this._messageQueue.push(message);
    } else {
        this.socketIO.send(message);
    }

    return message;
}

Beseda.prototype._createMessage = function(channel, message) {
    message = message || {};

    message.id       = Beseda.utils.uid();
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
}

Beseda.prototype._onReconnect = function() {
    this.log('Beseda reconnected');
    this.emit('reconnect');
}

Beseda.prototype._onDisconnect = function() {
    this._status == Beseda._statuses.DISCONNECTED;

    this.emit('disconnect');

    this.log('Beseda disconnected');
}

Beseda._statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
}