var Beseda = function(options) {
	Beseda._super.constructor.call(this);

    this.setOptions({
        host : document.location.hostname,
        port : 4000,
        ssl  : false,

        transports : [ 'longPolling', 'JSONPLongPolling' ]
    }, options);

    this._events       = {};
    this._status       = Beseda._statuses.DISCONNECTED;
    this._messageQueue = [];

    this.router   = new Beseda.Router(this);
    this.clientId = null;
	this.__channels = [];

    this._io = new Beseda.IO(this.options);

    var self = this;
    this._io.on('message', function(message) {
        self.router.dispatch(message);
    });
    
    this._io.on('error', function() {
 		self._status = Beseda._statuses.DISCONNECTED;
		setTimeout(function(){ self.connect(); }, 1000)
    });
};

Beseda.EventEmitter = function() {
	this.__events = {};
    this.__maxListeners = 10;
};

Beseda.EventEmitter.prototype.addListener = function(event, listener) {
    if (!this.__events[event]) {
        this.__events[event] = [];
    }

    this.__events[event].push(listener);

    if (this.__events[event].length > this.__maxListeners) {
        alert('Warning: possible EventEmitter memory leak detected. ' + this.__events[event].length + ' listeners added. Use emitter.setMaxListeners() to increase limit');
    }
};

Beseda.EventEmitter.prototype.setMaxListeners = function(count) {
    this.__maxListeners = count;

    return this;
}

Beseda.EventEmitter.prototype.on = Beseda.EventEmitter.prototype.addListener;

Beseda.EventEmitter.prototype.once = function(event, listener) {
	var self = this;

	var listenerClosure = function() {
		listener.apply(self, arguments);
		
		self.removeListener(event, listenerClosure);
	};
	
	this.on(event, listenerClosure);
};

Beseda.EventEmitter.prototype.removeListener = function(event, listener) {
    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            if (this.__events[event][i] === listener) {
                this.__events[event].splice(i, 1);
            }
        }
    }
};

Beseda.EventEmitter.prototype.removeAllListeners = function(event) {
	this.__events[event] = [];
};

Beseda.EventEmitter.prototype.emit = function() {
    var args = Array.prototype.slice.call(arguments);
    var event = args.shift();

    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            this.__events[event][i].apply(this, args);
        }
    }
};

Beseda.EventEmitter.prototype.listeners = function(event) {
    return this.__events[event] || [];
};

Beseda.utils = {
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
	}
};

Beseda.utils.inherits(Beseda, Beseda.EventEmitter);

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

    this.__channels[channel] = message;

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

    this._io.once('connect', function(connectionID) {

        self.clientId = connectionID;

        var message = self._createMessage('/meta/connect', additionalMessage);
        
    		self._io.send(message);
    		
   		self.log('Beseda send connection request', message);
    });

    this._io.connect();

    for (var key in this.__channels) {
    		this._sendMessage('/meta/subscribe', this.__channels[key]);
    }
};

Beseda.prototype.disconnect = function() {
    this._io.disconnect();
    
	this.clientId = null;
	this.__channels = [];

	this._status = Beseda._statuses.DISCONNECTED;
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
        this._io.send(this._createMessage(channel, message));
    }

    return message;
};

Beseda.prototype._createMessage = function(channel, message) {
    message = message || {};

    message.id       = this.clientId + '_' + ++Beseda.__lastMessageID;
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};

Beseda.prototype._onDisconnect = function() {
    this._status = Beseda._statuses.DISCONNECTED;

    this.emit('disconnect');

    this.log('Beseda disconnected');
};

Beseda.prototype.flushMessageQueue = function() {
	var messages = [];
	while (this._messageQueue.length) {
		messages.push(this._createMessage(this._messageQueue.shift(), this._messageQueue.shift()));
	}
	this._io.send(messages);
};

Beseda._statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

Beseda.__lastMessageID = 0;






Beseda.Router = function(client) {
    this.client = client;
};

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
            } else {            
            		this['_' + metaChannel].call(this, message);
            }
        } else {
            this._message(message);
        }
    }
};

Beseda.Router.prototype._connect = function(message) {
    if (message.successful) {
        this.client._status = Beseda._statuses.CONNECTED;

        this.client.flushMessageQueue();

        this.client.log('Beseda connected');
        
   		this.client.emit('connection', message);
    } else {
        this.client.disconnect();

        this.client.log('Beseda connection request declined', message);
        
        this.client.emit('error', message);
    }
};

Beseda.Router.prototype._error = function(message) {
    this.client.log('Beseda error: ' + message.data);
    this.client.emit('error', message);
};

Beseda.Router.prototype._subscribe = function(message) {
    if (message.successful) {
        this.client.log('Beseda subscribed to ' + message.subscription.toString(), message);
    } else {
        this.client.log('Beseda subscribe request declined', message);
        this.client.emit('error', message);
    }

    this.client.emit('subscribe', message.error, message);
    this.client.emit('subscribe:' + message.id, message.error, message);
};

Beseda.Router.prototype._unsubscribe = function(message) {
    if (message.successful) {
        this.client.log('Beseda unsubscribed from ' + message.subscription.toString(), message);
    } else {
        this.client.log('Beseda unsubscribe request declined', message);
        this.client.emit('error', message);
    }

    this.client.emit('unsubscribe', message.error, message);
    this.client.emit('unsubscribe:' + message.id, message.error, message);
};

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
};


Beseda.IO = function(options) {
	Beseda.IO._super.constructor.call(this);

	this.__options = options;

	this.__transport = Beseda.Transport.getBestTransport(options);
	this.__transport.setEmitter(this);
};

Beseda.utils.inherits(Beseda.IO, Beseda.EventEmitter);

Beseda.IO.prototype.connect = function() {
	this.__transport.connect(this.__options.host,
							 this.__options.port,
							 this.__options.ssl);
};

Beseda.IO.prototype.send = function(data) {
	var dataArray = [].concat(data);
	
	this.__transport.send(JSON.stringify(dataArray));
};

Beseda.IO.prototype.disconnect = function() {
	this.__transport.disconnect();
};


Beseda.Transport = function() {
	this._url          = null;
	this._typeSuffix   = null;
	this._connectionID = null;
	this._emitter      = null;

	this.__sendQueue = [];
};

Beseda.Transport._transports = {
	'longPolling'      : 'LongPolling',
	'JSONPLongPolling' : 'JSONPLongPolling'
};

Beseda.Transport.getBestTransport = function(options) {
	for(var i = 0; i < options.transports.length; i++) {

		var transportName = Beseda.Transport._transports[options.transports[i]]
		var transport = Beseda.Transport[transportName];
		
		if (transport) {
			if (transport.isAvailable(options)) {
				return new transport();
			}
		} else {
			throw Error('Ivalid transport ' + options.transports[i]);
		}
	}
};

Beseda.Transport.prototype.connect = function(host, port, ssl) {
	throw Error('Abstract method calling.');
};

Beseda.Transport.prototype.send = function(data) {
	throw Error('Abstract method calling.');
};

Beseda.Transport.prototype.disconnect = function() {
	throw Error('Abstract method calling.');
};

Beseda.Transport.prototype.setEmitter = function(emitter) {
	this._emitter = emitter;
};

Beseda.Transport.prototype._handleConnection = function(id) {
	this._connectionID = id;

	if (this._emitter) {
		this._emitter.emit('connect', this._connectionID);
	}
	
	while(this.__sendQueue.length) {
		this.send(this.__sendQueue.shift());
	}
};

Beseda.Transport.prototype._handleMessage = function(data) {
	if (data && data.messages) {
		while(data.messages.length) {
			this._emitter.emit('message', data.messages.shift());
		}
	}
};

Beseda.Transport.prototype._enqueue = function(data) {
	this.__sendQueue.push(data);
};



Beseda.Transport.LongPolling = function() {
	Beseda.Transport.LongPolling._super.constructor.call(this);

	this._typeSuffix = 'longPolling';

	this._connectionRequest = null;
	this._pollRequest = null;
	this._sendRequest = null;
	this._disconnectRequest = null;

	this._sendSuffix = '';
	this._deleteSuffix = '';

	this._initRequests();

	var self = this;

	this.__handleConnectionClosure = function(data) {
		self._handleConnection(data);
	};

	this.__handleMessageClosure = function(data) {
		self._handleMessage(data);
	};

	this.__handleErrorClosure = function() {
		self._emitter.emit('error');
	};

	this._connectionRequest.addListener('ready', this.__handleConnectionClosure);
	this._pollRequest.addListener('ready', this.__handleMessageClosure);
	this._connectionRequest.addListener('error', this.__handleErrorClosure);
	this._pollRequest.addListener('error', this.__handleErrorClosure);
};

Beseda.utils.inherits(Beseda.Transport.LongPolling, Beseda.Transport);

Beseda.Transport.LongPolling.isAvailable = function(options) {
	return document.location.hostname === options.host;
}

Beseda.Transport.LongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.Transport.LongPolling.Request('GET');
	this._pollRequest       = new Beseda.Transport.LongPolling.Request('GET');
	this._sendRequest       = new Beseda.Transport.LongPolling.Request('PUT');
	this._disconnectRequest = new Beseda.Transport.LongPolling.Request('DELETE');
};

Beseda.Transport.LongPolling.prototype.connect = function(host, port, ssl) {
    var protocol = ssl ? 'https' : 'http';

    this._url = protocol + '://' + host + ':' + port + '/beseda/io';

    var connectUrl = this._url + "/" + this._typeSuffix;

    this._connectionRequest.send(connectUrl);
};

Beseda.Transport.LongPolling.prototype.send = function(data) {
	if (this._connectionID) {
		this._sendRequest.data = data;
		this._sendRequest.send();
	} else {
		this._enqueue(data);
	}
};

Beseda.Transport.LongPolling.prototype.disconnect = function(data) {
	this._disconnectRequest.send();
	this._connectionID = null;
};

Beseda.Transport.LongPolling.prototype._handleConnection = function(message) {
	var data = this._parseMessage(message);
	
	var id = data.connectionId;

	if (id) { 
		this._sendRequest.url = 
		this._pollRequest.url =
		this._disconnectRequest.url = 
			this._url + "/" + this._typeSuffix + "/" + id;

		this._sendRequest.url += this._sendSuffix;
		this._disconnectRequest.url += this._deleteSuffix;

		Beseda.Transport.LongPolling._super._handleConnection.call(this, id);

		this.__poll();
	}
};

Beseda.Transport.LongPolling.prototype._parseMessage = function(message) {
	return JSON.parse(message);
};

Beseda.Transport.LongPolling.prototype._handleMessage = function(message) {
	var data = this._parseMessage(message);

	Beseda.Transport.LongPolling._super._handleMessage.call(this, data);

	this.__poll();
};

Beseda.Transport.LongPolling.prototype.__poll = function() {
	if (this._connectionID) {
		this._pollRequest.send();
	}
};



Beseda.Transport.LongPolling.Request = function(method) {
	Beseda.Transport.LongPolling.Request._super.constructor.call(this);
	
	this.url = null;
	this.method = method || 'GET';
	this.data = null;
};

Beseda.utils.inherits(Beseda.Transport.LongPolling.Request, Beseda.EventEmitter);

Beseda.Transport.LongPolling.Request.prototype.send = function(url) {
	if (url) {
		this.url = url;
	}

	var requestURL = this.url;

	if (request != null)
		request.abort();

	var request = !!+'\v1' ? new XMLHttpRequest() :
							 new ActiveXObject("Microsoft.XMLHTTP");

	var self = this;
	request.onreadystatechange = function() {
		self.__requestStateHandler(request);
	}

	if (this.method === 'GET' && this.data) {
		requestURL += 
			(requestURL.indexOf('?') === -1 ? '?' : '&') + this.data;
	}

	request.open(this.method, encodeURI(requestURL), true);

	var sendData = null;
	if (this.method !== 'GET') {
		sendData = this.data;
		request.setRequestHeader
			('Content-Type', 'application/x-www-form-urlencoded');
	}

	request.send(sendData);
};

Beseda.Transport.LongPolling.Request.prototype.__requestStateHandler = function(request) {
	if (request.readyState === 4) {
		if (request.status === 200) {
			this.emit('ready', request.responseText);
		} else {
			this.emit('error');
		}

		request.onreadystatechange = null;
		request.abort();
	}
};



Beseda.Transport.JSONPLongPolling = function() {
	Beseda.Transport.JSONPLongPolling._super.constructor.call(this);

	this._typeSuffix = 'JSONPLongPolling';
	this._sendSuffix = '/send';
	this._deleteSuffix = '/destroy';
};

Beseda.utils.inherits(Beseda.Transport.JSONPLongPolling, Beseda.Transport.LongPolling);

Beseda.Transport.JSONPLongPolling.isAvailable = function(options) {
	return true;
}

Beseda.Transport.JSONPLongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.Transport.JSONPLongPolling.JSONPRequest();
	this._pollRequest = new Beseda.Transport.JSONPLongPolling.JSONPRequest();
	
	this._sendRequest = new Beseda.Transport.JSONPLongPolling.JSONPRequest();
	this._disconnectRequest = new Beseda.Transport.JSONPLongPolling.JSONPRequest();
};

Beseda.Transport.JSONPLongPolling.prototype._parseMessage = function(message) {
	return message;
};

Beseda.Transport.JSONPLongPolling.JSONPRequest = function() {
	Beseda.Transport.JSONPLongPolling.JSONPRequest._super.constructor.call(this);
	
	this.url = null;
	this.data = '';

	this.__id = ++Beseda.Transport.JSONPLongPolling.JSONPRequest.__lastID;
	this.__requestIndex = 0;
	this.__scripts = {};
	
	Beseda.Transport.JSONPLongPolling.JSONPRequest.__callbacks[this.__id] = {};
};

Beseda.utils.inherits(Beseda.Transport.JSONPLongPolling.JSONPRequest, Beseda.EventEmitter);

Beseda.Transport.JSONPLongPolling.JSONPRequest.__callbacks = [];
Beseda.Transport.JSONPLongPolling.JSONPRequest.__lastID = 0;

Beseda.Transport.JSONPLongPolling.JSONPRequest.prototype.send = function(url) {
	if (url) {
		this.url = url;
	}

	var timeout = (function(index, self){
		return setTimeout(function() {
			document.body.removeChild(document.getElementById('request_' + self.__id + '_' + index));
			delete self.__scripts[index];

			self.emit('error');
		}, 15000);
	})(this.__requestIndex, this);
	
	(function(index, self, timeout){
		Beseda.Transport.JSONPLongPolling.JSONPRequest.__callbacks[self.__id][index] = function(data) {
			clearTimeout(timeout);
		
			console.log('request_' + self.__id + '_' + index);
			document.body.removeChild(document.getElementById('request_' + self.__id + '_' + index));
			delete self.__scripts[index];

			self.emit('ready', data);
		};
	})(this.__requestIndex, this, timeout);

	
	var requestURL = this.url;

	requestURL += (requestURL.indexOf('?') === -1 ? '?' : '&') + 
		'callback=Beseda.Transport.JSONPLongPolling.JSONPRequest.__callbacks[' + 
			this.__id + '][' + this.__requestIndex + 
		']&' + new Date().getTime() + '&messages=' + this.data;

	this.__scripts[this.__requestIndex] = document.createElement('script');
	this.__scripts[this.__requestIndex].src = requestURL;
	this.__scripts[this.__requestIndex].id = 'request_' + this.__id + '_' + this.__requestIndex;
	
	document.body.appendChild(this.__scripts[this.__requestIndex]);

	this.data = null;
	this.__requestIndex++;
};


Beseda.Transport.JSONPLongPolling.FormRequest = function() {
	Beseda.Transport.JSONPLongPolling.JSONPRequest._super.constructor.call(this);
	
	this.url = null;
};



