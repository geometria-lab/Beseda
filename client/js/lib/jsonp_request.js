
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

