var util  = require('util'),
	url  = require('url'),
	http  = require('http'),
    https = require('https'),
    qs    = require('querystring');

var Transport = require('./../transport.js');

var LongPollingTransport = module.exports = function() {
    Transport.prototype.constructor.call(this);

    this._urlBase = '';
    this._typeSuffix = 'longPolling';

	this.__pollRequest = null;
	this.__sendRequest = null;
	this.__connectionRequest = null;
	this.__disconnectRequest = null;
};

util.inherits(LongPollingTransport, Transport);

LongPollingTransport.prototype.connect = function(host, port, ssl) {
	this._urlBase = (ssl ? 'https' : 'http') +
						'://' + host + ':' + port +
						'/beseda/io/' + this._typeSuffix;

	this.__cleanRequest(this.__connectionRequest);
	
    this.__connectionRequest = new LongPollingTransport.Request
	    (this._urlBase, 'GET');

    this.__connectionRequest.on('ready', this._handleOpen.bind(this));
    this.__connectionRequest.on('error', this._handleError.bind(this));
    this.__connectionRequest.send();
};

LongPollingTransport.prototype.disconnect = function() {
	this.__cleanAll();

    this.__disconnectRequest = new LongPollingTransport.Request
	   (this._urlBase + '/' + this._connectionID, 'DELETE');

	this.__disconnectRequest.on('error', this._handleError.bind(this));
	this.__disconnectRequest.on('ready', this._handleDisconnect.bind(this));
    this.__disconnectRequest.send();

    this._connectionID = null;
}

LongPollingTransport.prototype._doSend = function(data) {
	this.__cleanRequest(this.__sendRequest);

    this.__sendRequest = new LongPollingTransport.Request
		(this._urlBase + '/' + this._connectionID, 'PUT');
	
	this.__sendRequest.on('error', this._handleError.bind(this));
	this.__sendRequest.send(data);
};

LongPollingTransport.prototype._handleOpen = function(connectionData) {
	var data = this._decodeData(connectionData);

	this._isConnected = true;

	Transport.prototype._handleConnection.call(this, data.connectionId);

	this.__poll();
};

LongPollingTransport.prototype._handleData = function(message) {
	Transport.prototype._handleMessages.call(this, this._decodeData(message));

	this.__poll();
};

LongPollingTransport.prototype._handleError = function(error) {
	Transport.prototype._handleError.call(this, error);
	this.__cleanAll();
};

LongPollingTransport.prototype._handleDisconnect = function() {
	Transport.prototype._handleDisconnect.call(this);
	this.__cleanAll();
};

LongPollingTransport.prototype.__poll = function() {
	this.__cleanRequest(this.__pollRequest);

	if (this._connectionID) {
        this.__pollRequest = new LongPollingTransport.Request
	        (this._urlBase + '/' + this._connectionID, 'GET');

        this.__pollRequest.on('ready',  this._handleData.bind(this));
        this.__pollRequest.on('error', this._handleError.bind(this));
        this.__pollRequest.send();
	}
};

LongPollingTransport.prototype.__cleanRequest = function(request) {
	if (request) {
		request.removeAllListeners();
		request.abort();
		request = null;
	}
};

LongPollingTransport.prototype.__cleanAll = function() {
	this.__cleanRequest(this.__disconnectRequest);
	this.__cleanRequest(this.__connectionRequest);
	this.__cleanRequest(this.__pollRequest);
	this.__cleanRequest(this.__sendRequest);
};

//////////////////////////////////////////////////////////////////////////////

LongPollingTransport.Request = function(href, method) {
    process.EventEmitter.call(this);

    var parsedURL = url.parse(href);

    this._options = {
		host: parsedURL.hostname,
		port: parsedURL.port,
		path: parsedURL.pathname + '/' + Date.now(),
		method: method || 'GET',
	    isSSL: parsedURL.protocol === 'https:'
    };

    this._request = null;
    this._response = null;
    this._responseBody = '';
};

util.inherits(LongPollingTransport.Request, process.EventEmitter);

LongPollingTransport.Request.prototype.abort = function() {
	if (this._request) {
		this._request.abort();
	}
	
	this.__cleanup();
};

LongPollingTransport.Request.prototype.send = function(body) {
    if (body) {
        if (this._options.method === 'GET') {
            this._options.path +=
	            (this._options.path.indexOf('?') === -1 ? '?' : '&') +
		            qs.escape(body);
        }
    }

    this._request = (this._options.isSSL ? https : http).request
	    (this._options, this._onResponse.bind(this));

    this._request.on('error', this._onError.bind(this));

    if (body) {
        this._request.write(body);
    }

    this._request.end();
};

LongPollingTransport.Request.prototype.__cleanup = function() {
	if (this._response) {
		this._response.removeAllListeners('data');
		this._response.removeAllListeners('end');
		this._response = null;
	}

	if (this._request) {
		this._request.removeAllListeners('error');
		this._request = null;
	}

	this._responseBody = '';

};

LongPollingTransport.Request.prototype._onResponse = function(response) {
    this._response = response;
    this._response.on('data', this._collectResponseData.bind(this));
    this._response.on('end', this._endRequest.bind(this));
}

LongPollingTransport.Request.prototype._collectResponseData = function(chunk) {
    this._responseBody += chunk;
}

LongPollingTransport.Request.prototype._endRequest = function() {
    if (this._response.statusCode === 200) {
        this.emit('ready', this._responseBody);
    } else {
        this.emit('error', this._response.statusCode + ' - ' + this._responseBody);
    }

	this.__cleanup();
}

LongPollingTransport.Request.prototype._onError = function(error) {
	this.emit('error', 'Can\'t send request:' + error);

	this.__cleanup();
}