var util  = require('util'),
    http  = require('http'),
    https = require('https'),
    qs    = require('querystring');

var Transport = require('./../transport.js');

module.exports = LongPollingTransport = function() {
    Transport.prototype.constructor.call(this);

    this._host = null;
    this._port = null;
    this._ssl  = null;

    this._typeSuffix = 'longPolling';
}

util.inherits(LongPollingTransport, Transport);

LongPollingTransport.prototype.connect = function(host, port, ssl) {
    this._host = host;
    this._port = port;
    this._ssl  = ssl;

    var connectionRequest = new LongPollingTransport.Request({
        method : 'GET',
        host : this._host,
        port : this._port,
        ssl  : this._ssl,
        path : '/beseda/io/' + this._typeSuffix
    });
    connectionRequest.on('ready', this._handleConnection.bind(this));
    connectionRequest.on('error', this._handleError.bind(this));
    connectionRequest.send();
};

LongPollingTransport.prototype.disconnect = function() {
    var disconnectRequest = new LongPollingTransport.Request({
        method : 'DELETE',
        host   : this._host,
        port   : this._port,
        ssl    : this._ssl,
        path   : '/beseda/io/' + this._typeSuffix + '/' + this._connectionID
    });
    disconnectRequest.on('error', this._handleError.bind(this));
    disconnectRequest.send();

    this._connectionID = null;
}

LongPollingTransport.prototype.send = function(data, ids) {
	if (this._connectionID) {
        var sendRequest = new LongPollingTransport.Request({
            method : 'PUT',
            host   : this._host,
            port   : this._port,
            ssl    : this._ssl,
            path   : '/beseda/io/' + this._typeSuffix + '/' + this._connectionID
        });

        
        sendRequest.on('error', function(error) {
            var i = ids.length - 1;
            while (i >= 0) {            
                this._emitter.emit('message:' + ids[i], error);
                
                i--;
            }
        }.bind(this));
        
        sendRequest.send(data);
	} else {
		this._enqueue(data);
	}
};

LongPollingTransport.prototype._handleConnection = function(message) {
    var data = this._parseMessage(message),
        id = data.connectionId;

	if (id) {
		Transport.prototype._handleConnection.call(this, id);

		this.__poll();
	}
};

LongPollingTransport.prototype._handleMessage = function(message) {
	var data = this._parseMessage(message);

	Transport.prototype._handleMessage.call(this, data);

	this.__poll();
};

LongPollingTransport.prototype._handleError = function(error) {
    this._emitter.emit('error', error);
}

LongPollingTransport.prototype._parseMessage = function(message) {
	return JSON.parse(message);
};

LongPollingTransport.prototype.__poll = function() {
	if (this._connectionID) {
        var pollRequest = new LongPollingTransport.Request({
            method : 'GET',
            host   : this._host,
            port   : this._port,
            ssl    : this._ssl,
            path   : '/beseda/io/' + this._typeSuffix + '/' + this._connectionID
        });
        pollRequest.on('ready', this._handleMessage.bind(this));
        pollRequest.on('error', this._handleError.bind(this));
        pollRequest.send();
	}
};

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

LongPollingTransport.Request.prototype._endRequest = function(response) {
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
