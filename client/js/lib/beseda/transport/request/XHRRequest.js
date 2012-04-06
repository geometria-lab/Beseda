/**
 * @constructor
 * @extends BesedaPackage.events.EventEmitter
 */
BesedaPackage.transport.request.XHRRequest = function(method, xDomain) {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this._isXDomain = xDomain;

    this.url = null;
    this.method = method;
    this.data = null;
};

BesedaPackage.transport.request.XHRRequest.createRequest = function(xDomain) {
    var request = null;

    if (window.XMLHttpRequest && (!xDomain || (new XMLHttpRequest()).withCredentials != undefined)) {
        request = new XMLHttpRequest();
    } else if (window.XDomainRequest && xDomain) {
        request = new XDomainRequest();
        request.onprocess = function(){};
    } else if (window.ActiveXObject && !xDomain) {
        request = new ActiveXObject('Microsoft.XMLHTTP');
    }

    return request;
};

BesedaPackage.utils.inherits(BesedaPackage.transport.request.XHRRequest, BesedaPackage.events.EventEmitter);

/**
 *
 * @param {string=} url
 */
BesedaPackage.transport.request.XHRRequest.prototype.send = function(url) {
    if (url) {
        this.url = url;
    }

    var requestURL = this.url + '/' + (new Date().getTime());
    var request = BesedaPackage.transport.request.XHRRequest.createRequest(this._isXDomain);

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

BesedaPackage.transport.request.XHRRequest.prototype.__requestStateHandler = function(request) {
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