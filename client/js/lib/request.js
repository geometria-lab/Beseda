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


