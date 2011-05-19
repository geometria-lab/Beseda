var util = require('util');

var utils = require('./../../server/lib/utils.js');

var Router = require('./router.js'),
    IO     = require('./io.js');

module.exports = Client = function(options) {
    process.EventEmitter.call(this);

    this.options = utils.merge({
        host : '127.0.0.1',
        port : 4000,
        ssl  : false,

        transport : 'longPolling'
    }, options);

    this._events       = {};
    this._status       = Client._statuses.DISCONNECTED;
    this._messageQueue = [];

    this.router   = new Router(this);
    this.clientId = null;

    this._io = new IO(this.options);

    this._io.on('message', this.router.dispatch.bind(this.router));
    this._io.on('error', this._onError.bind(this));

    process.on('exit', function() {
        process.nextTick(function(){
            this.disconnect();
        }.bind(this));
    }.bind(this));
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

Client.prototype.connect = function(callback, additionalMessage) {
    if (this.isConnected()) {
        return false;
    }

    this._status = Client._statuses.CONNECTING;

    if (callback) {
        this.once('connection', callback);
    }

    var self = this;

    this._io.once('connect', function(connectionID) {
        self.clientId = connectionID;

        var message = self._createMessage('/meta/connect', additionalMessage);

        self._io.send(message);
    });

    this._io.connect();
};

Client.prototype.subscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this._sendMessage('/meta/subscribe', message);

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

    if (callback) {
        this.once('unsubscribe:' + message.id, callback);
    }
};

Client.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this._sendMessage(channel, { data : message });

    if (callback) {
        // TODO: Handle errors from IO
        this.once('message:' + channel + ':' + message.id, callback);
    }

    return this;
};

Client.prototype.disconnect = function() {
    this._status = Client._statuses.DISCONNECTED;

    this._io.disconnect();
};

Client.prototype._sendMessage = function(channel, message) {
    if (this.isDisconnected()) {
        throw Error ('You must connect before send message');
    }

    var message = this._createMessage(channel, message);

    if (this.isConnecting()) {
        this._messageQueue.push(message);
    } else {
        this._io.send(message);
    }

    return message;
};

Client.prototype._createMessage = function(channel, message) {
    message = message || {};

    message.id       = ++Client.__lastMessageID;
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};

Client.prototype._onError = function(error) {
    this._status = Client._statuses.DISCONNECTED;
    this.emit('error', error);
}

Client.prototype.flushMessageQueue = function() {
    for (var i = 0; i < this._messageQueue.length; i++) {
        this._messageQueue[i].clientId = this.clientId;
    }
	this._io.send(this._messageQueue);
    this._messageQueue = [];
};