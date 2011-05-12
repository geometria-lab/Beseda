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
