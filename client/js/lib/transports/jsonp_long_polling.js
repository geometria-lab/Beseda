
Beseda.Transport.JSONPLongPolling = function() {
	Beseda.Transport.JSONPLongPolling._super.constructor.call(this);
	
	this._dataType = 'jsonp';
	this._typeSuffix = 'jsonp-polling';
};

Beseda.utils.inherits(Beseda.Transport.JSONPLongPolling, Beseda.Transport.LongPolling);

Beseda.Transport.JSONPLongPolling.isAvailable = function(options) {
	return true;
}

Beseda.Transport.JSONPLongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.Transport.JSONPLongPolling.JSONPRequest();
	this._pollRequest = new Beseda.Transport.JSONPLongPolling.JSONPRequest();
	
	this._sendRequest = new Beseda.Transport.JSONPLongPolling.Request('POST');
};

Beseda.Transport.JSONPLongPolling.JSONPRequest = function() {
	Beseda.Transport.JSONPLongPolling.JSONPRequest._super.constructor.call(this);
	
	this.url = null;

	this.__id = Beseda.Transport.JSONPLongPolling.JSONPRequest.__lastID++;
	this.__script = null;

	var self = this;
	Beseda.Transport.JSONPLongPolling.JSONPRequest.__callbacks[this.__id] = function(data) {
		self.__handleData(data);
	};
};

Beseda.utils.inherits(Beseda.Transport.JSONPLongPolling.JSONPRequest, Beseda.EventEmitter);

Beseda.Transport.JSONPLongPolling.JSONPRequest.__callbacks = [];
Beseda.Transport.JSONPLongPolling.JSONPRequest.__lastID = 0;

Beseda.Transport.JSONPLongPolling.JSONPRequest.prototype.__handleData = function(data) {
	document.body.removeChild(this.__script);
	this.__script = null;
	
	this.emit('ready', data);
};

Beseda.Transport.JSONPLongPolling.JSONPRequest.prototype.send = function(url) {
	if (url) {
		this.url = url;
	}

	if (!this.__script) {
		var requestURL = this.url;

		requestURL += (requestURL.indexOf('?') === -1 ? '?' : '&') + 
			'callback=Beseda.Transport.JSONPLongPolling.JSONPRequest.__callbacks[' + this.__id + ']&' + 
				new Date().getTime();

		this.__script = document.createElement('script');
		this.__script.src = requestURL;
		this.__script.async = 'async';
		
		document.body.appendChild(this.__script);

	}
};


Beseda.Transport.JSONPLongPolling.FormRequest = function() {
	Beseda.Transport.JSONPLongPolling.JSONPRequest._super.constructor.call(this);
	
	this.url = null;
};

Beseda.utils.inherits(Beseda.Transport.JSONPLongPolling.FormRequest, Beseda.EventEmitter);

Beseda.Transport.JSONPLongPolling.FormRequest.prototype.send = function(url) {
	
};


