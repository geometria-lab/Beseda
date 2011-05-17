var util = require('util');

var utils = require('./../../server/lib/utils.js');

var Router = require('./router.js'),
    IO     = require('./io.js');

module.exports = Client = function(options) {
    process.EventEmitter.call(this);

    this.options = utils.mergeObjects({
        host : '127.0.0.1',
        port : 4000,
        ssl  : false,

        transport : 'longPolling'//, 'JSONPLongPolling' ]
    }, options);

    this._events       = {};
    this._status       = Client._statuses.DISCONNECTED;
    this._messageQueue = [];

    this.router   = new Router(this);
    this.clientId = null;

    this._io = new IO(this.options);

    this._io.on('message', self.router.dispatch.bind(this));
    this._io.on('disconnect', this._onDisconnect.bind(this));
    /*
    this._io.on('error', function() {
 		self._status = Beseda._statuses.DISCONNECTED;
		setTimeout(function(){ self.connect(); }, 1000)
    });
    */
};

Client._statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

Client.__lastMessageID = 0;

util.inherits(Client, process.EventEmitter);

Client.prototype.isConnected = function() {
    return this._status == Client._statuses.CONNECTED;
};

Client.prototype.isDisconnected = function() {
    return this._status == Client._statuses.DISCONNECTED;
};

Client.prototype.isConnecting = function() {
    return this._status == Client._statuses.CONNECTING;
};

Client.prototype.subscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/subscribe', message);

    //this.log('Beseda send subscribe request', message);

	if (callback) {
        this.once('subscribe:' + message.id, callback);
    }
};

Client.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/unsubscribe', message);

    //this.log('Beseda send unsubscribe request', message);

    if (callback) {
        this.once('unsubscribe:' + message.id, callback);
    }
};

Client.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this._sendMessage(channel, { data : message });

    //this.log('Beseda send publish request', message);

    if (callback) {
        this.once('message:' + channel + ':' + message.id, callback);
    }

    return this;
};

Client.prototype.connect = function(callback, additionalMessage) {
    if (this.isConnected()) {
        return false;
    }

    this._status = Client._statuses.CONNECTING;

    var self = this;

    this._io.once('connect', function(connectionID) {

        self.clientId = connectionID;

        var message = self._createMessage('/meta/connect', additionalMessage);

    		self._io.send(message);

   		//self.log('Beseda send connection request', message);
    });

    this._io.connect();
};

Client.prototype.disconnect = function() {
    this._io.disconnect();
};

Client.prototype._sendMessage = function(channel, message) {
    if (this.isDisconnected()) {
        throw Error ('You must connect before send message');
    }

    if (this.isConnecting()) {
        this._messageQueue.push(channel, message);
    } else {
        this._io.send(this._createMessage(channel, message));
    }

    return message;
};

Client.prototype._createMessage = function(channel, message) {
    message = message || {};

    message.id       = this.clientId + '_' + ++Client.__lastMessageID;
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};

Client.prototype._onDisconnect = function() {
    this._status = Client._statuses.DISCONNECTED;

    this.emit('disconnect');

    //this.log('Beseda disconnected');
};

Client.prototype.flushMessageQueue = function() {
	var messages = [];
	while (this._messageQueue.length) {
		messages.push(this._createMessage(this._messageQueue.shift(), this._messageQueue.shift()));
	}
	this._io.send(messages);
};