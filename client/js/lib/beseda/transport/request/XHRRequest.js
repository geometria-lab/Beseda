/**
 * @constructor
 * @extends beseda.events.EventEmitter
 */
beseda.transport.request.XHRRequest = function(method) {
    beseda.events.EventEmitter.prototype.constructor.call(this);

    this.url = null;
    this.method = method;
    this.data = null;
};

beseda.utils.inherits(beseda.transport.request.XHRRequest, beseda.events.EventEmitter);

/**
 *
 * @param {string=} url
 */
beseda.transport.request.XHRRequest.prototype.send = function(url) {
    if (url) {
        this.url = url;
    }

    var requestURL = this.url + '/' + (new Date().getTime());
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

beseda.transport.request.XHRRequest.prototype.__requestStateHandler = function(request) {
    if (request.readyState === 4) {
        if (request.status === 200) {
            this.emit('ready', request.responseText);
        } else {
            this.emit('error');
        }

        request.onreadystatechange = null;
        request.abort();
	    request = null;
    }
};
