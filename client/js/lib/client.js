var Beseda = function(options) {
	Beseda._super.constructor.call(this);

    this.setOptions({
        io : {
            host : document.location.hostname,
            port : 4000
        }
    }, options);

    this._events       = {};
    this._status       = Beseda._statuses.DISCONNECTED;
    this._messageQueue = [];

    this.router   = new Beseda.Router(this);
    this.clientId = null;

    if (this.options.io.constructor == Object) {
        this.__io = new Beseda.IO(this.options.io.host, this.options.io.port);
        this.__io.setTransport(new Beseda.LongPolling());
        this.__io.setEmitter(this);
    } else {
    		debugger;
        //this.socketIO = this.options.socketIO;
    }

    var self = this;
    this.on(Beseda.IO.EVENT_MESSAGE, function(data) {
        self.router.dispatch(JSON.parse(data));
    });
};

inherits(Beseda, EventEmitter);

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

    this.log('Beseda send subscribe request', message);

    if (callback) {
        this.on('subscribe:' + message.id, callback);
    }
};

Beseda.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/unsubscribe', message);

    this.log('Beseda send unsubscribe request', message);

    if (callback) {
    		// TODO: implement once()
        this.on('unsubscribe:' + message.id, callback);
    }
};

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
};

Beseda.prototype.connect = function(callback, additionalMessage) {
    if (this.isConnected()) {
        return false;
    }

    this._status = Beseda._statuses.CONNECTING;

    var self = this;

    this.on('io_connect', function(connectionID) {
        self.clientId = connectionID;

        var message = self._createMessage('/meta/connect', additionalMessage);
        
    		self.__io.send(message);
    		
   		this.log('Beseda send connection request', message);

   		self.removeAllListeners('io_connect');
    });

    this.__io.connect();
};

Beseda.prototype.disconnect = function() {
    this.__io.disconnect();
};

Beseda.prototype.setOptions = function(options, extend) {
    this.options = Beseda.utils.mergeObjects(options, extend);
};

Beseda.prototype.log = function() {
    if ('console' in window && 'log' in console) {
		console.log.apply(console, arguments);
    }
};

Beseda.prototype._sendMessage = function(channel, message) {
    if (this.isDisconnected()) {
        throw 'You must connect before send message';
    }

    if (this.isConnecting()) {
        this._messageQueue.push(channel, message);
    } else {
        this.__io.send(this._createMessage(channel, message));
    }

    return message;
};

Beseda.prototype._createMessage = function(channel, message) {
    message = message || {};

    message.id       = this.clientId + '_' + ++Beseda.__lastMessageID;
    message.channel  = channel;
    message.clientId = this.clientId;

    return JSON.stringify(message);
};

Beseda.prototype._onReconnect = function() {
    this.log('Beseda reconnected');
    this.emit('reconnect');
};

Beseda.prototype._onDisconnect = function() {
    this._status == Beseda._statuses.DISCONNECTED;

    this.emit('disconnect');

    this.log('Beseda disconnected');
};

Beseda.prototype.flushMessageQueue = function() {
	while (this._messageQueue.length) {
		this.__io.send(this._createMessage(this._messageQueue.shift(), this._messageQueue.shift()));
	}
};

Beseda._statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

Beseda.__lastMessageID = 0;

