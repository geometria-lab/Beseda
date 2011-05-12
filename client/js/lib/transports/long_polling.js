Beseda.LongPolling = function() {
	Beseda.LongPolling._super.constructor.call(this);
	
	this._dataType = 'text';
	this._typeSuffix = '/long-polling';
	this._getParams = '';
};

Beseda.utils.inherits(Beseda.LongPolling, Beseda.Transport);

Beseda.LongPolling.prototype.connect = function(host, port) {
	if (!this._url) {
		this._url = 'http://' + host + ':' + port + "/beseda/io";

		this.__doConnect();
	}
};

Beseda.LongPolling.prototype.__doConnect = function() {
	if (!this.__handleConnectionClosure) {
		var self = this;
		
		this.__handleConnectionClosure = function(data) {
			self._handleConnection(data);
		};
	}

	$.get(
		this._url + "/connect" + this._typeSuffix + this._getParams, 
		this.__handleConnectionClosure, 
		this._dataType
	);
};

Beseda.LongPolling.prototype._handleConnection = function(data) {
	Beseda.LongPolling._super._handleConnection.call(this, data);

	this.__poll();
};

Beseda.LongPolling.prototype.__poll = function() {
	if (this._connectionID) {

		if (!this.__handleMessageClosure) {
			var self = this;

			this.__handleMessageClosure = function(data) {
				self._handleMessage(data);
			};
		}

		$.get(
			this._url + "/" + this._connectionID + this._getParams, 
			this.__handleMessageClosure, 
			this._dataType
		);
	}
};


Beseda.LongPolling.prototype._handleMessage = function(data) {
	Beseda.LongPolling._super._handleMessage.call(this, data);

	this.__poll();
};

Beseda.LongPolling.prototype.send = function(data) {
	if (this._connectionID) {
		$.post(this._url + "/" + this._connectionID + this._getParams, data);
	} else {
		this._enqueue(data);
	}
};
