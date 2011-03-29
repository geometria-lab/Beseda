var Beseda = function(options) {
	this.setOptions({
		socketIO : {
			host : document.location.host
			port : document.location.port || 80
		}
	}, options);
	
	this.events = {};
    this.isConnected = false;
    this.clientId = Beseda.uid();

	// Setup Socket.io
	if (this.options.socketIO.constructor == Object) {
		var socketOptions = this._cloneObject(this.options.socketIO);

		var host = socketOptions.host;
	    delete socketOptions.host;

		this.io = new io.Socket(host, socketOptions);
	} else {
		this.socketIO = this.options.socketIO;
	}

	this.socketIO.on('message', this._dispatchMessage.bind(this));
	this.socketIO.on('reconnect', this.emit.bind(this, 'reconnect'));
	this.socketIO.on('disconnect', this.emit.bind(this, 'disconnect'));
}

Beseda.prototype.subscribe = function(channel, message) {
	this.connect();

	message = message || {};
	message.subscription = channel;

	return this._sendMessage('/meta/subscribe', message);
}

Beseda.prototype.unsubscribe = function(channel, message) {
	message = message || {};
	message.subscription = channel;

	return this._sendMessage('/meta/unsubscribe', message);
}

Beseda.prototype.publish = function(channel, message) {
	this.connect();
	
	return this._sendMessage(channel, message);
}

Beseda.prototype.connect = function(message)
{
	if (this.isConnected) {
		return false;
	}

	this.socketIO.connect();

	this._sendMessage('/meta/connect', message || {});
}

Beseda.prototype.disconnect = function() {
	this.socketIO.disconnect();
	this.isConnected = false;
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
		for (var i = 0, length = this._events[event].length; i < length; i++) {
			if (this._events[name][i] == listener) {
				this._events[name].splice(i, 1);
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
	var event = arguments.shift();

	if (event in this._events) {
		for (var listener in this._events[event]) {
			listener.apply(this, arguments);
		}
    }
}

Beseda.prototype.listeners = function(event) {
	return event in this._events ? this._events[event] : [];
}

Beseda.prototype.setOptions = function(options, extend) {
    this.options = this._mergeObjects(options, extend);
}

Beseda.prototype._sendMessage(channel, message, callback) {
	//message.id       = Beseda.uid();
	message.channel  = channel;
	message.clientId = this.clientId;

	return this.socket.send([message]);
}

Beseda.protoype._dispatchMessage = function(message) {
    switch (message.channel) {
		case '/meta/connect':
			if (!message.successful && this.listeners('connection').length == 0) {
				throw 'Cannot connect: ' + message.error;
			} else {
				this.emit('connection', message);
			}
			break;
		case '/meta/error':
			if (this.listeners('error').length == 0) {
				throw 'Error: ' + message.error;
			} else {
				this.emit('error', message);
			}
            break;
		case '/meta/subscribe':
			if (!message.successful && this.listeners('subscribe').length == 0) {
				throw 'Cannot subscribe: ' + message.error;
			} else {
				this.emit('subscribe', message);
			}
			break;
		case '/meta/unsubscribe':
			this.emit('unsubscribe', message);
			break;
		default:
			if (successful in message) {
				
			}
		
			if (console in window &&
				this.listeners('message').length == 0 &&
				this.listeners('message:' + message.channel).length == 0) {
				console.log(message);
			} else {
				this.emit('message', message.channel, message);
				this.emit('message:' + message.channel);
			}
	}
}

Beseda.prototype._cloneObject = function(object) {
	return this._mergeObjects({}, object);
}

Beseda.prototype._mergeObjects = function(object, extend) {
	for (var p in extend) {
    	try {
        	if (extend[p].constructor == Object) {
            	object[p] = this._mergeObjects(object[p], extend[p]);
            } else {
                object[p] = extend[p];
            }
        } catch (e) {
            object[p] = extend[p];
        }
    }

	return object;
}

Beseda.uid = function() {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');
    var uid = [];

    for (var i = 0; i < 22; i++) {
        uid[i] = chars[0 | Math.random() * 64];
    }

    return uid.join('');
}