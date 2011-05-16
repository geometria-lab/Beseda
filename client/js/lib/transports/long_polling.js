Beseda.Transport.LongPolling = function() {
	Beseda.Transport.LongPolling._super.constructor.call(this);

	this._typeSuffix = 'long-polling';

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

Beseda.utils.inherits(Beseda.Transport.LongPolling, Beseda.Transport);

Beseda.Transport.LongPolling.isAvailable = function(options) {
	return document.location.hostname === options.host;
}

Beseda.Transport.LongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.Transport.LongPolling.Request('GET');
	this._pollRequest       = new Beseda.Transport.LongPolling.Request('GET');
	this._sendRequest       = new Beseda.Transport.LongPolling.Request('POST');
};

Beseda.Transport.LongPolling.prototype.connect = function(host, port, ssl) {
	if (!this._url) {
		var protocol = ssl ? 'https' : 'http';

		this._url = protocol + '://' + host + ':' + port + "/beseda/io";

		var connectUrl = this._url + "/connect/" + this._typeSuffix;

		this._connectionRequest.send(connectUrl);
	}
};

Beseda.Transport.LongPolling.prototype._handleConnection = function(data) {
	this._sendRequest.url = 
	this._pollRequest.url =
		this._url + "/" + data;

	Beseda.Transport.LongPolling._super._handleConnection.call(this, data);

	this.__poll();
};

Beseda.Transport.LongPolling.prototype.__poll = function() {
	if (this._connectionID) {
		this._pollRequest.send();
	}
};

Beseda.Transport.LongPolling.prototype._handleMessage = function(data) {
	Beseda.Transport.LongPolling._super._handleMessage.call(this, data);

	this.__poll();
};

Beseda.Transport.LongPolling.prototype.send = function(data) {
	if (this._connectionID) {
		this._sendRequest.data = data;
		this._sendRequest.send();
	} else {
		this._enqueue(data);
	}
};

Beseda.Transport.LongPolling.Request = function(method) {
	Beseda.Transport.LongPolling.Request._super.constructor.call(this);
	
	this.url = null;
	this.method = method || 'GET';
	this.data = null;
};

Beseda.utils.inherits(Beseda.Transport.LongPolling.Request, Beseda.EventEmitter);

Beseda.Transport.LongPolling.Request.prototype.__requestStateHandler = function(request) {
	if (request.readyState === 4) {
		this.emit('ready', request.responseText);
		request.abort();
	}
};

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
	if (this.method === 'POST') {
		sendData = this.data;
		request.setRequestHeader
			('Content-Type', 'application/x-www-form-urlencoded');
	}

	request.send(sendData);
};
