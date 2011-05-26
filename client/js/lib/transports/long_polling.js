Beseda.Transport.LongPolling = function() {
    Beseda.Transport.LongPolling._super.constructor.call(this);

    this._typeSuffix = 'longPolling';

	this._url = null;

    this._openRequest  = null;
    this._dataRequest  = null;
    this._sendRequest  = null;
    this._closeRequest = null;

	this.__handleOpenClosure = null;
	this.__handleDataClosure = null;
	this.__handleCloseClosure = null;

	this.__initClosuredHandlers();

	this._initRequests();
	this._initListeners();
};

Beseda.Utils.inherits(Beseda.Transport.LongPolling, Beseda.Transport);

Beseda.Transport.LongPolling.isAvailable = function(options) {
    return document.location.hostname === options.host;
};

Beseda.Transport.LongPolling.prototype.__initClosuredHandlers = function() {
	var self = this;

    this.__handleOpenClosure = function(data) {
        self._handleOpen(data);
    };

    this.__handleDataClosure = function(data) {
        self._handleData(data);
    };

    this.__handleCloseClosure = function(data) {
        self._handleError(data);
    };
};

Beseda.Transport.LongPolling.prototype._initRequests = function() {
	// TODO: Use only two requests: send and data
    this._openRequest  = new Beseda.Transport.LongPolling.Request('GET');
    this._dataRequest  = new Beseda.Transport.LongPolling.Request('GET');
    this._sendRequest  = new Beseda.Transport.LongPolling.Request('PUT');
    this._closeRequest = new Beseda.Transport.LongPolling.Request('DELETE');
};

Beseda.Transport.LongPolling.prototype._initListeners = function() {
	this._openRequest.addListener('ready', this.__handleOpenClosure);
	this._openRequest.addListener('error', this.__handleCloseClosure);

	this._dataRequest.addListener('ready', this.__handleDataClosure);
	this._dataRequest.addListener('error', this.__handleCloseClosure);
}

Beseda.Transport.LongPolling.prototype._initURLs = function(id) {
	this._sendRequest.url =
    this._dataRequest.url =
    this._closeRequest.url =
        this._url + "/" + this._typeSuffix + "/" + id;
};

Beseda.Transport.LongPolling.prototype.connect = function(host, port, ssl) {
    this._url = 'http' + (ssl ? 's' : '') + '://' +
	            host + (port ? ':' + port : '') +
	            '/beseda/io';

    this._openRequest.send(this._url + "/" + this._typeSuffix);
};

Beseda.Transport.LongPolling.prototype._handleOpen = function(connectionData) {
    var data = this._decodeData(connectionData);

	this._isConnected = true;

	this._initURLs(data.connectionId);

    Beseda.Transport.LongPolling._super._handleConnection.call(this, data.connectionId);

    this.__poll();
};

Beseda.Transport.LongPolling.prototype._doSend = function(data) {
	this._sendRequest.data = data;
    this._sendRequest.send();
};

Beseda.Transport.LongPolling.prototype.disconnect = function() {
    this._closeRequest.send();
	this._isConnected = false;
};

Beseda.Transport.LongPolling.prototype._handleData = function(data) {
    var data = this._decodeData(data);

    Beseda.Transport.LongPolling._super._handleMessages.call(this, data);

    this.__poll();
};

Beseda.Transport.LongPolling.prototype.__poll = function() {
    if (this._isConnected) {
        this._dataRequest.send();
    }
};

///////////////////////////////////////////////////////////////////////////////

Beseda.Transport.LongPolling.Request = function(method) {
    Beseda.Transport.LongPolling.Request._super.constructor.call(this);
    
    this.url = null;
    this.method = method;
    this.data = null;
};

Beseda.Utils.inherits(Beseda.Transport.LongPolling.Request, EventEmitter);

Beseda.Transport.LongPolling.Request.prototype.send = function(url) {
    if (url) {
        this.url = url;
    }

    var requestURL = this.url + '/' + (new Date().getTime());

    if (request) {
	    request.abort();
    }

    var request = !!+'\v1' ? new XMLHttpRequest() :
                             new ActiveXObject("Microsoft.XMLHTTP");

    var self = this;
    request.onreadystatechange = function() {
        self.__requestStateHandler(request);
    };

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
	        this.__requestStateHandler = null;
        }

        request.onreadystatechange = null;
        request.abort();
    }
};
