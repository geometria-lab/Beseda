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

Beseda.prototype.on = function(event, listener) {
    if (!(event in this._events)) {
        this._events[event] = [];
    }
    this._events[event].push(listener);
}

Beseda.prototype.addListener = Beseda.prototype.on;

Beseda.prototype.removeListener = function(event, listener) {
    if (event in this._events) {
        for (var i = 0; i < this._events[event].length; i++) {
            if (this._events[event][i] == listener) {
                this._events[event].splice(i, 1);
            }
        }
    }
}

Beseda.prototype.removeAllListeners = function(event) {
    if (event in this._events) {
        this._events[event] = [];
    }
}

Beseda.prototype.emit = function() {
	var args = Array.prototype.slice.call(arguments);
    var event = args.shift();

    if (event in this._events) {
        for (var i = 0; i < this._events[event].length; i++) {
            this._events[event][i].apply(this, args);
        }
    }
}

Beseda.prototype.listeners = function(event) {
    return event in this._events ? this._events[event] : [];
}

Beseda.Router = function(client) {
    this.client = client;
}

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
}

Beseda.Router.prototype._connect = function(message) {
    if (message.successful) {
        this.client._status = Beseda._statuses.CONNECTED;
        this.client.socketIO.send(this.client._messageQueue);

        this.client.log('Beseda connected');
    } else {
        this.client.disconnect();

        this.client.log('Beseda connection request declined', message);
        this.client.emit('error', message);
    }

    this.client._messageQueue = [];

    this.client.emit('connection', message);
}

Beseda.Router.prototype._error = function(message) {
    this.client.log('Beseda error: ' + message.data);
    this.client.emit('error', message);
}

Beseda.Router.prototype._subscribe = function(message) {
    if (message.successful) {
        this.client.log('Beseda subscribed to ' + message.subscription.toString(), message);
    } else {
        this.client.log('Beseda subscribe request declined', message);
        this.client.emit('error', message);
    }

    this.client.emit('subscribe', message.error, message);
    this.client.emit('subscribe:' + message.id, message.error, message);
}

Beseda.Router.prototype._unsubscribe = function(message) {
    if (message.successful) {
        this.client.log('Beseda unsubscribed from ' + message.subscription.toString(), message);
    } else {
        this.client.log('Beseda unsubscribe request declined', message);
        this.client.emit('error', message);
    }

    this.client.emit('unsubscribe', message.error, message);
    this.client.emit('unsubscribe:' + message.id, message.error, message);
}

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
}

Beseda.utils = {
    uid : function() {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');
        var uid = [];

        for (var i = 0; i < 22; i++) {
            uid[i] = chars[0 | Math.random() * 64];
        }

        return uid.join('');
    },

    cloneObject : function(object) {
        return this.mergeObjects({}, object);
    },

    mergeObjects : function(object, extend) {
        for (var p in extend) {
            try {
                if (extend[p].constructor == Object) {
                    object[p] = this.mergeObjects(object[p], extend[p]);
                } else {
                    object[p] = extend[p];
                }
            } catch (e) {
                object[p] = extend[p];
            }
        }

        return object;
    }
}

