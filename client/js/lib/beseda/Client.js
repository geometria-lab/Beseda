
/**
 * @constructor
 * @extends {beseda.events.EventEmitter}
 */
beseda.Client = function(options) {
    beseda.events.EventEmitter.prototype.constructor.call(this);

    this.__options = beseda.utils.mergeObjects({
        host : document.location.hostname,
        port : 4000,
        ssl  : false,

        transports : [ 'webSocket', 'longPolling', 'JSONPLongPolling' ]
    }, options);

	this._io = null;

    this.__status = beseda.Client.__statuses.DISCONNECTED;
    this.__messageQueue = [];
	this.__channels = [];

    this.router   = new beseda.Router(this);
    this.clientId = null;

	this._init();
};

beseda.utils.inherits(beseda.Client, beseda.events.EventEmitter);

beseda.Client.__statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

beseda.Client.prototype._init = function() {
	this._io = new beseda.IO(this.__options);

    var self = this;
    this._io.addListener('message', function(message) {
        self.router.dispatch(message);
    });

    this._io.addListener('error', function() {
	    self.__destroy();

        setTimeout(function(){
	        self.connect();
        }, 5000)
    });

    this.__firstMessage = null;
    this.__handleConnectionClosure = function(connectionID) {
        self.clientId = connectionID;

        var message = self.__createMessage('/meta/connect', self.__firstMessage);

        self._io.send(message);
        self.__firstMessage = null;
    };
};

beseda.Client.prototype.isConnected = function() {
    return this.__status == beseda.Client.__statuses.CONNECTED;
};

beseda.Client.prototype.isDisconnected = function() {
    return this.__status == beseda.Client.__statuses.DISCONNECTED;
};

beseda.Client.prototype.isConnecting = function() {
    return this.__status == beseda.Client.__statuses.CONNECTING;
};

beseda.Client.prototype.subscribe = function(channel, callback, additionalMessage) {
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

beseda.Client.prototype.unsubscribe = function(channel, callback, additionalMessage) {
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


beseda.Client.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this.__sendMessage(channel, { data : message });

    if (callback) {
        this.once('publish:' + message.id, callback);
    }
};

/**
 *
 * @param {string=}  host
 * @param {number=} port
 * @param {boolean=} ssl
 * @param {Object=} message
 */
beseda.Client.prototype.connect = function(host, port, ssl, message) {
	//TODO: Do somethinng when connecting
    if (!this.isConnected()) {
		this.__status = beseda.Client.__statuses.CONNECTING;
		this.__firstMessage = message;

	    //TODO: Nothing happen if another connet listener appear
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

beseda.Client.prototype.disconnect = function() {
    this._io.disconnect();

	//TODO: Handle with it
	this.__channels = [];
	this.__destroy();

	this.emit('disconnect');
};

beseda.Client.prototype.applyConnection = function() {
    this.__status = beseda.Client.__statuses.CONNECTED;
    this.__flushMessageQueue();
};

beseda.Client.prototype.__destroy = function() {
	this.__status = beseda.Client.__statuses.DISCONNECTED;

	this.clientId = null;
	this.__messageQueue = [];
};

beseda.Client.prototype.__sendMessage = function(channel, message) {
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

beseda.Client.prototype.__createMessage = function(channel, message) {
    message = message || {};

    message.id       = beseda.utils.uid();
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};


beseda.Client.prototype.__flushMessageQueue = function() {
    for (var i = 0; i < this.__messageQueue.length; i++) {
        this.__messageQueue[i].clientId = this.clientId;
    }

    this._io.send(this.__messageQueue);
    this.__messageQueue = [];
};

var Beseda = beseda.Client;