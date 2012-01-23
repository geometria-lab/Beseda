(function() {
	var XHRRequest = function(method) {
	    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

	    this.url = null;
	    this.method = method;
	    this.data = null;
	};

	beseda.inherits(XHRRequest, beseda.events.EventEmitter);

	XHRRequest.prototype.send = function(url) {
	    if (url) {
	        this.url = url;
	    }

	    var requestURL = this.url + '/' + (new Date().getTime());
	    var request = this.__createRequest();

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

	XHRRequest.prototype.__requestStateHandler = function(request) {
	    if (request.readyState === 4) {
		    if (request.status === 200) {
	            this.emit('ready', request.responseText);
	        } else {
	            this.emit('error');
	        }

	        request.abort();
		    request = null;
	    }
	};

	XHRRequest.prototype.__createRequest = function() {
		var request =  null;

		if (!+'\v1') {
			if (window.XDomainRequest) {
				request = new XDomainRequest();
				request.onprocess = function(){};
			} else {
				request = new ActiveXObject("Microsoft.XMLHTTP");
			}
		} else {
			request = new XMLHttpRequest();
		}

		return request;
	};

})();