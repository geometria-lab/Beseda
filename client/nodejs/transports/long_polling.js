var util  = require('util'),
    http  = require('http'),
    https = require('https'),
    qs    = require('querystring');

var Transport = require('./../transport.js');

var LongPollingTransport = module.exports = function() {
    Transport.prototype.constructor.call(this);

    this._host = null;
    this._port = null;
    this._ssl  = null;

    this._typeSuffix = 'longPolling';

	this.__handleOpenClosure = this._handleOpen.bind(this);
	this.__handleErrorClosure = this._handleError.bind(this);
	this.__handleDataClosure = this._handleData.bind(this);
};

util.inherits(LongPollingTransport, Transport);

LongPollingTransport.prototype.connect = function(host, port, ssl) {
    this._host = host;
    this._port = port;
    this._ssl  = ssl;

    var connectionRequest = new LongPollingTransport.Request({
        method : 'GET',
        host   : this._host,
        port   : this._port,
        ssl    : this._ssl,
        path   : '/beseda/io/' + this._typeSuffix + '/' + Date.now()
    });
    connectionRequest.on('ready', this.__handleOpenClosure);
    connectionRequest.on('error', this.__handleErrorClosure);
    connectionRequest.send();
};

LongPollingTransport.prototype.disconnect = function() {
    var disconnectRequest = new LongPollingTransport.Request({
        method : 'DELETE',
        host   : this._host,
        port   : this._port,
        ssl    : this._ssl,
        path   : '/beseda/io/' + this._typeSuffix +
	             '/' + this._connectionID +
	             '/' + Date.now()
    });
    disconnectRequest.on('error', this.__handleErrorClosure);
    disconnectRequest.send();

    this._connectionID = null;
}

LongPollingTransport.prototype._doSend = function(data) {
    var sendRequest = new LongPollingTransport.Request({
        method : 'PUT',
        host   : this._host,
        port   : this._port,
		ssl    : this._ssl,
		path   : '/beseda/io/' + this._typeSuffix +
				 '/' + this._connectionID +
	             '/' + Date.now()
	});
	
	sendRequest.on('error', this.__handleErrorClosure);
	sendRequest.send(data);
};

LongPollingTransport.prototype._handleOpen = function(connectionData) {
	var data = this._decodeData(connectionData);

	this._isConnected = true;

	Transport.prototype._handleConnection.call(this, data.connectionId);

	this.__poll();
};

LongPollingTransport.prototype._handleData = function(message) {
	var data = this._decodeData(message);

	Transport.prototype._handleMessages.call(this, data);

	this.__poll();
};

LongPollingTransport.prototype.__poll = function() {
	if (this._connectionID) {
        var pollRequest = new LongPollingTransport.Request({
            method : 'GET',
            host   : this._host,
            port   : this._port,
            ssl    : this._ssl,
            path   : '/beseda/io/' + this._typeSuffix +
	                 '/' + this._connectionID +
	                 '/' + Date.now()
        });
        pollRequest.on('ready',  this.__handleDataClosure);
        pollRequest.on('error', this.__handleErrorClosure);
        pollRequest.send();
	}
};

///////////////////////////////////////////////////////////////////////////////

LongPollingTransport.Request = function(options) {
    process.EventEmitter.call(this);

    this._options = options;

    this._request = null;
    this._response = null;
    this._responseBody = null;
};

util.inherits(LongPollingTransport.Request, process.EventEmitter);

LongPollingTransport.Request.prototype.send = function(body) {
    if (body) {
        if (this._options.method == 'GET') {
            this._options.path += (this._options.path.indexOf('?') === -1 ? '?' : '&') + qs.escape(body);
        }
    }

    this._request = (this._options.ssl ? https : http).request(this._options, this._onResponse.bind(this));
    this._request.on('error', this._onError.bind(this));

    if (body) {
        this._request.write(body);
    }

    this._request.end();
};

LongPollingTransport.Request.prototype._onResponse = function(response) {
    this._response = response;
    this._responseBody = '';
    this._response.on('data', this._collectResponseData.bind(this));
    this._response.on('end', this._endRequest.bind(this));
}

LongPollingTransport.Request.prototype._collectResponseData = function(chunk) {
    this._responseBody += chunk;
}

LongPollingTransport.Request.prototype._endRequest = function() {
    if (this._response.statusCode == 200) {
        this.emit('ready', this._responseBody);
    } else {
        this.emit('error', this._response.statusCode + ' - ' + this._responseBody);
    }

    this._response.removeAllListeners();
    this._request.removeAllListeners();
}

LongPollingTransport.Request.prototype._onError = function(error) {
    this.emit('error', 'Can\'t send request:' + error);
}
