var EventEmitter = function() {
	this.__events = {};
};

EventEmitter.prototype.addListener = function(event, listener) {
    if (!this.__events[event]) {
        this.__events[event] = [];
    }
    
    this.__events[event].push(listener);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(event, listener) {
	var self = this;

	var listenerClosure = function() {
		listener.apply(self, arguments);
		
		self.removeListener(event, listenerClosure);
	};
	
	this.on(event, listenerClosure);
};

EventEmitter.prototype.removeListener = function(event, listener) {
    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            if (this.__events[event][i] === listener) {
                this.__events[event].splice(i, 1);
            }
        }
    }
};

EventEmitter.prototype.removeAllListeners = function(event) {
	this.__events[event] = [];
};

EventEmitter.prototype.emit = function() {
    var args = Array.prototype.slice.call(arguments);
    var event = args.shift();

    if (this.__events[event]) {
        for (var i = 0; i < this.__events[event].length; i++) {
            this.__events[event][i].apply(this, args);
        }
    }
};

EventEmitter.prototype.listeners = function(event) {
    return this.__events[event] || [];
};



var Beseda = function(options) {
	Beseda._super.constructor.call(this);

    this.setOptions({
        io : {
            host : document.location.hostname,
            port : document.location.port || 4000
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



function inherits(Class, Parent) {
	var Link = function() {};
	Link.prototype = Parent.prototype;

	Class.prototype = new Link();
	Class.prototype.constructor = Class;
	Class._super = Class.prototype._super = Parent.prototype;

	Link = null;
};

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
            }

            this['_' + metaChannel].call(this, message);
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


Beseda.IO = function(host, port) {
	this.__host = host;
	this.__port = port;

	this.__transport = null;
	this.__emitter = null;
};

Beseda.IO.EVENT_CONNECT 	= 'io_connect';
Beseda.IO.EVENT_MESSAGE 	= 'io_message';
Beseda.IO.EVENT_DISCONNECT = 'io_disconnect';
Beseda.IO.EVENT_ERROR 	    = 'io_error';

Beseda.IO.prototype.setTransport = function(transport) {
	this.__transport = transport;

	if (this.__emitter) {
		this.__transport.setEmitter(this.__emitter);
	}
};

Beseda.IO.prototype.setEmitter = function(emitter) {
	if (this.__transport) {
		this.__transport.setEmitter(emitter);
	} else {
		this.__emitter = emitter;
	}
};

Beseda.IO.prototype.connect = function() {
	this.__transport.connect(this.__host, this.__port);
};

Beseda.IO.prototype.send = function(data) {
	this.__transport.send(data);
};

Beseda.IO.prototype.disconnect = function() {
	this.__transport.disconnect();
};


Beseda.Request = function() {
	Beseda.Request._super.constructor.call(this);
	
	this.url = null;
	this.method = "GET";
	this.data = null;
};

Beseda.utils.inherits(Beseda.Request, EventEmitter);

Beseda.Request.prototype.__requestStateHandler = function(request) {
	if (request.readyState === 4) {
		this.emit('ready', request.responseText);
		request.abort();
	}
};

Beseda.Request.prototype.send = function(url) {
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
	if (this.method === 'POST') {
		sendData = this.data;
		request.setRequestHeader
			('Content-Type', 'application/x-www-form-urlencoded');
	}

	request.send(sendData);
};





Beseda.JSONPRequest = function() {
	Beseda.JSONPRequest._super.constructor.call(this);
	
	this.url = null;

	this.__id = Beseda.JSONPRequest.__lastID++;
	this.__script = null;

	var self = this;
	Beseda.JSONPRequest.__callbacks[this.__id] = function(data) {
		self.__handleData(data);
	};
};

Beseda.utils.inherits(Beseda.JSONPRequest, EventEmitter);

Beseda.JSONPRequest.__callbacks = [];
Beseda.JSONPRequest.__lastID = 0;

Beseda.JSONPRequest.prototype.__handleData = function(data) {
	document.body.removeChild(this.__script);
	this.__script = null;
	
	this.emit('ready', data);
};

Beseda.JSONPRequest.prototype.send = function(url) {
	if (url) {
		this.url = url;
	}

	if (!this.__script) {
		var requestURL = this.url;

		requestURL += (requestURL.indexOf('?') === -1 ? '?' : '&') + 
			'callback=Beseda.JSONPRequest.__callbacks[' + this.__id + ']&' + new Date().getTime();

		this.__script = document.createElement('script');
		this.__script.src = requestURL;
		this.__script.async = 'async';
		
		document.body.appendChild(this.__script);

	}
};



Beseda.Transport = function() {
	this._url = null;
	this._typeSuffix = null;
	this._connectionID = null;
	this._emitter = null;
	
	this.__sendQueue = [];
};

Beseda.Transport.DATA_SEPARATOR	 = '|';

Beseda.Transport.prototype.connect = function(host, port) {
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

Beseda.Transport.prototype._handleConnection = function(data) {
	this._connectionID = data;

	if (this._emitter) {
		this._emitter.emit(Beseda.IO.EVENT_CONNECT, this._connectionID);
	}
	
	while(this.__sendQueue.length) {
		this.send(this.__sendQueue.shift());
	}
};

Beseda.Transport.prototype._handleMessage = function(data) {
	if (data && data.length > 0) {
		var parsedData = data.split(Beseda.Transport.DATA_SEPARATOR);
		
		while(parsedData.length) {
			this._emitter.emit(Beseda.IO.EVENT_MESSAGE, parsedData.shift());
		}
	}
};

Beseda.Transport.prototype._enqueue = function(data) {
	this.__sendQueue.push(data);
};



Beseda.LongPolling = function() {
	Beseda.LongPolling._super.constructor.call(this);
	
	this._typeSuffix = '/long-polling';

	this._connectionRequest = null;
	this._pollRequest = null;
	this._sendRequest = null;

	this._initRequests();
	
	var self = this;
		
	this.__handleConnectionClosure = function(data) {
		self._handleConnection(data);
	};

	this.__handleMessageClosure = function(data) {
		self._handleMessage(data);
	};

	this._connectionRequest.addListener('ready', this.__handleConnectionClosure);
	this._pollRequest.addListener('ready', this.__handleMessageClosure);
};

Beseda.utils.inherits(Beseda.LongPolling, Beseda.Transport);

Beseda.LongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.Request();
	this._pollRequest = new Beseda.Request();
	this._sendRequest = new Beseda.Request();
	this._sendRequest.method = 'POST';
};

Beseda.LongPolling.prototype.connect = function(host, port) {
	if (!this._url) {
		this._url = 'http://' + host + ':' + port + "/beseda/io";
		
		this._connectionRequest.url 
			= this._url + "/connect" + this._typeSuffix;

		this.__doConnect();
	}
};

Beseda.LongPolling.prototype.__doConnect = function() {
	this._connectionRequest.send();
};

Beseda.LongPolling.prototype._handleConnection = function(data) {
	this._sendRequest.url = 
	this._pollRequest.url =
		this._url + "/" + data;
		
	Beseda.LongPolling._super._handleConnection.call(this, data);
		
	this.__poll();
};

Beseda.LongPolling.prototype.__poll = function() {
	if (this._connectionID) {
		this._pollRequest.send();
	}
};


Beseda.LongPolling.prototype._handleMessage = function(data) {
	Beseda.LongPolling._super._handleMessage.call(this, data);

	this.__poll();
};

Beseda.LongPolling.prototype.send = function(data) {
	if (this._connectionID) {
		this._sendRequest.data = data;
		this._sendRequest.send();
	} else {
		this._enqueue(data);
	}
};



Beseda.JSONPLongPolling = function() {
	Beseda.JSONPLongPolling._super.constructor.call(this);
	
	this._dataType = 'jsonp';
	this._typeSuffix = '/jsonp-polling';
};

Beseda.utils.inherits(Beseda.JSONPLongPolling, Beseda.LongPolling);

Beseda.JSONPLongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.JSONPRequest();
	this._pollRequest = new Beseda.JSONPRequest();
	
	this._sendRequest = new Beseda.Request();
	this._sendRequest.method = 'POST';
};


