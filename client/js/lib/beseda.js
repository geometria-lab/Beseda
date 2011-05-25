var Beseda = function(options) {
    Beseda._super.constructor.call(this);

    options = Beseda.Utils.mergeObjects({
        host : document.location.hostname,
        port : 4000,
        ssl  : false,

        transports : [ 'longPolling', 'JSONPLongPolling' ]
    }, options);

    this._status = Beseda._statuses.DISCONNECTED;
    this._messageQueue = [];

    this.router   = new Beseda.Router(this);
    this.clientId = null;
    this.__channels = [];

    this._io = new Beseda.IO(options);

    var self = this;
    this._io.on('message', function(message) {
        self.router.dispatch(message);
    });
    
    this._io.on('error', function() {
         self._status = Beseda._statuses.DISCONNECTED;
        setTimeout(function(){ self.connect(); }, 5000)
    });

    this.__firstMessage = null;
    this.__handleConnectionClosure = function(connectionID) {
        self.clientId = connectionID;

        var message = self._createMessage('/meta/connect', self.__firstMessage);

        self._io.send(message);
        self.__firstMessage = null;
    };
};

Beseda._statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

Beseda.__lastMessageID = 0;

Beseda.Utils = {
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
    }, 

    inherits : function(Class, Parent) {
        var Link = function() {};
        Link.prototype = Parent.prototype;

        Class.prototype = new Link();
        Class.prototype.constructor = Class;
        Class._super = Class.prototype._super = Parent.prototype;

        Link = null;
    },

    log : function(message) {
        if ('console' in window && 'log' in console) {
            console.log(message);
        }
    },

    __base64chars : null,
    __base64charsLength : null,

    uid : function(length) {
        length = length || 10;

        if (!this.__base64chars) {
            this.__base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
            this.__base64charsLength = this.__base64chars.length;
        }

        for (var i = 0, id = []; i < length; i++) {
            id[i] = this.__base64chars[0 | Math.random() * this.__base64charsLength];
        }

        return id.join('');
    }
};

Beseda.Utils.inherits(Beseda, EventEmitter);

Beseda.prototype.isConnected = function() {
    return this._status == Beseda._statuses.CONNECTED;
};

Beseda.prototype.isDisconnected = function() {
    return this._status == Beseda._statuses.DISCONNECTED;
};

Beseda.prototype.isConnecting = function() {
    return this._status == Beseda._statuses.CONNECTING;
};

Beseda.prototype.subscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/subscribe', message);

    this.once('subscribe:' + message.id, function(error) {
        if (!error) {
            this.__channels[channel] = message;
        }
    });

    if (callback) {
        this.once('subscribe:' + message.id, callback);
    }

    return this;
};

Beseda.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/unsubscribe', message);

    this.once('unsubscribe:' + message.id, function(error) {
        if (!error) {
            delete this.__channels[channel];
        }
    });

    if (callback) {
        this.once('unsubscribe:' + message.id, callback);
    }

    return this;
};

Beseda.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this._sendMessage(channel, { data : message });

    if (callback) {
        this.once('message:' + message.id, callback);
    }

    return this;
};

/**
 *
 */
Beseda.prototype.connect = function(host, port, ssl) {
    if (this.isConnected()) {
        return false;
    }

    this._status = Beseda._statuses.CONNECTING;
    this.__firstMessage = additionalMessage;

    if (!this._io.listeners('connect').length) {
        this._io.on('connect', this.__handleConnectionClosure);
    }

    this._io.connect(host, port, ssl);

    for (var key in this.__channels) {
        this._sendMessage('/meta/subscribe', this.__channels[key]);
    }

    return this;
};

Beseda.prototype.disconnect = function() {
    this._io.disconnect();

    this.clientId = null;
    this.__channels = [];

    this._status = Beseda._statuses.DISCONNECTED;

    return this;
};

Beseda.prototype.applyConnection = function() {
    this._status = Beseda._statuses.CONNECTED;

    this._flushMessageQueue();
};

Beseda.prototype._sendMessage = function(channel, message) {
    if (!this.isDisconnected()) {
        message = this._createMessage(channel, message);

        if (this.isConnecting()) {
            this._messageQueue.push(message);
        } else {
            this._io.send(message);
        }

        return message;
    }
};

Beseda.prototype._createMessage = function(channel, message) {
    message = message || {};

    message.id       = Beseda.Utils.uid();
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};

Beseda.prototype._onDisconnect = function() {
    this._status = Beseda._statuses.DISCONNECTED;

    this.emit('disconnect');
};

Beseda.prototype._flushMessageQueue = function() {
    for (var i = 0; i < this._messageQueue.length; i++) {
        this._messageQueue[i].clientId = this.clientId;
    }

    this._io.send(this._messageQueue);

    this._messageQueue = [];
};
