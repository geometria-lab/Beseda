
/**
 * @constructor
 * @extends {BesedaPackage.events.EventEmitter}
 */
BesedaPackage.Client = function(options) {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this.__options = BesedaPackage.utils.mergeObjects({
        host : document.location.hostname,
        port : 4000,
        ssl  : false,

        transports : [ 'webSocket', 'longPolling', 'JSONPLongPolling' ],

        reconnect : true,
        reconnectDelay : 1000,
        reconnectMaxAttempts : 20
    }, options);

    this.router   = new BesedaPackage.Router(this);
    this.clientId = null;

    this._io = new BesedaPackage.IO(this.__options);

    this.__status = BesedaPackage.Client.__statuses.DISCONNECTED;
    this.__messageQueue = [];
	this.__channels = [];
    this.__connectionRequestMessage = null;
    this.__reconnectTimeout = null;
    this.__reconnectAttemptsCount = 0;

    var self = this;
    this._io.addListener('message', function(message) {
        self.router.dispatch(message);
    });

    this._io.addListener('error', function() {
        self.__destroy();

        if (self.__options.reconnect) {
            self.__reconnect();
        }
    });

    this.__handleConnectionClosure = function(connectionID) {
        self.clientId = connectionID;

        self.__resetReconnection();

        var message = self.__createMessage('/meta/connect', self.__connectionRequestMessage);

        self._io.send(message);
    };
};

BesedaPackage.utils.inherits(BesedaPackage.Client, BesedaPackage.events.EventEmitter);

BesedaPackage.Client.__statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

BesedaPackage.Client.prototype.isConnected = function() {
    return this.__status == BesedaPackage.Client.__statuses.CONNECTED;
};

BesedaPackage.Client.prototype.isDisconnected = function() {
    return this.__status == BesedaPackage.Client.__statuses.DISCONNECTED;
};

BesedaPackage.Client.prototype.isConnecting = function() {
    return this.__status == BesedaPackage.Client.__statuses.CONNECTING;
};

BesedaPackage.Client.prototype.isReconnecting = function() {
    return this.__reconnectTimeout !== null;
}


BesedaPackage.Client.prototype.subscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this.__sendMessage('/meta/subscribe', message);

	var self = this;
    this.once('subscribe:' + message.id, function(error) {
        if (!error) {
	        self.__channels[channel] = message;
        }
    });

    if (callback) {
        this.once('subscribe:' + message.id, callback);
    }
};

BesedaPackage.Client.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this.__sendMessage('/meta/unsubscribe', message);

	var self = this;
    this.once('unsubscribe:' + message.id, function(error) {
        if (!error) {
            delete self.__channels[channel];
        }
    });

    if (callback) {
        this.once('unsubscribe:' + message.id, callback);
    }
};


BesedaPackage.Client.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this.__sendMessage(channel, { data : message });

    if (callback) {
        this.once('publish:' + message.id, callback);
    }
};

BesedaPackage.Client.prototype.connect = function(host, port, ssl, message) {
    if (!this.isConnected() || !this.isConnecting()) {
        if (this.isReconnecting()) {
            this.__resetReconnection();
        }

		this.__status = BesedaPackage.Client.__statuses.CONNECTING;

        if (message !== undefined) {
            this.__connectionRequestMessage = message;
        }

	    //TODO: Nothing happen if another connect listener appear
		if (!this._io.listeners('connect').length) {
			this._io.on('connect', this.__handleConnectionClosure);
		}

		this._io.connect(host, port, ssl);

	    //TODO: Move to another method
		for (var key in this.__channels) {
			this.__sendMessage('/meta/subscribe', this.__channels[key]);
		}
    }
};

BesedaPackage.Client.prototype.disconnect = function() {
    this._io.disconnect();

	//TODO: Handle with it
	this.__channels = [];
	this.__destroy();
    this.__resetReconnection();

	this.emit('disconnect');
};

BesedaPackage.Client.prototype.applyConnection = function() {
    this.__status = BesedaPackage.Client.__statuses.CONNECTED;
    this.__flushMessageQueue();
};

BesedaPackage.Client.prototype.setConnectionMessage = function(message) {
    this.__connectionRequestMessage = message;
};

BesedaPackage.Client.prototype.__reconnect = function() {
    if (this.isReconnecting()) {
        return false;
    }

    if (this.__options.reconnectMaxAttempts > this.__reconnectAttemptsCount) {
        this.__reconnectAttemptsCount++;

        var self = this,
            delay = this.__options.reconnectDelay * this.__reconnectAttemptsCount;

        this.emit('reconnecting', this.__reconnectAttemptsCount, delay);

        this.__reconnectTimeout = setTimeout(function() {
            self.__reconnectTimeout = null;
            self.connect();
        }, delay);
    } else {
        this.__reconnectAttemptsCount = 0;
        this.emit('reconnectError')
    }
}

BesedaPackage.Client.prototype.__resetReconnection = function() {
    this.__reconnectAttemptsCount = 0;
    clearTimeout(this.__reconnectTimeout);
    this.__reconnectTimeout = null;
}

BesedaPackage.Client.prototype.__destroy = function() {
	this.__status = BesedaPackage.Client.__statuses.DISCONNECTED;

	this.clientId = null;
	this.__messageQueue = [];
};

BesedaPackage.Client.prototype.__sendMessage = function(channel, message) {
    if (!this.isDisconnected()) {
        message = this.__createMessage(channel, message);

        if (this.isConnecting()) {
            this.__messageQueue.push(message);
        } else {
            this._io.send(message);
        }

        return message;
    }
};

BesedaPackage.Client.prototype.__createMessage = function(channel, message) {
    message = message || {};

    message.id       = BesedaPackage.utils.uid();
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};

BesedaPackage.Client.prototype.__flushMessageQueue = function() {
    for (var i = 0; i < this.__messageQueue.length; i++) {
        this.__messageQueue[i].clientId = this.clientId;
    }

    this._io.send(this.__messageQueue);
    this.__messageQueue = [];
};

var Beseda = BesedaPackage.Client;