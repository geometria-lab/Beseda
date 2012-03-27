/**
 * @constructor
 * @extends BesedaPackage.events.EventEmitter
 */
BesedaPackage.transport.request.JSONPRequest = function() {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this.url = null;
    this.data = null;

    this.__id = ++BesedaPackage.transport.request.JSONPRequest.__lastID;
    this.__requestIndex = 0;
};

BesedaPackage.utils.inherits(BesedaPackage.transport.request.JSONPRequest, BesedaPackage.events.EventEmitter);

BesedaPackage.transport.request.JSONPRequest.__callbacks = {};
BesedaPackage.transport.request.JSONPRequest.__lastID = 0;

BesedaPackage.transport.request.JSONPRequest.ERROR_TIMEOUT = 15000;

/**
 *
 * @param {string=} url
 */
BesedaPackage.transport.request.JSONPRequest.prototype.send = function(url) {
    if (url) {
        this.url = url;
    }

	var script = document.createElement('script');
	script.id = 'request_' + this.__id + '_' + this.__requestIndex;

    var requestURL = this.url + '/' + (new Date().getTime()) +
        '?callback=BesedaPackage.transport.request.JSONPRequest.__callbacks["' +
        script.id + '"]';

    if (this.data !== null) {
        requestURL += '&messages=' + this.data;
    }

	script.src = requestURL;

	///////////////////////////////////////////////////////////////////////////

	var self = this;
	var timeout = setTimeout(function() {
		clearTimeout(timeout);

		document.body.removeChild(script);

		delete BesedaPackage.transport.request.JSONPRequest.__callbacks[script.id];

		self.emit('error');
	}, BesedaPackage.transport.request.JSONPRequest.ERROR_TIMEOUT);

	BesedaPackage.transport.request.JSONPRequest.__callbacks[script.id] = function(data) {
		clearTimeout(timeout);

		document.body.removeChild(script);

		delete BesedaPackage.transport.request.JSONPRequest.__callbacks[script.id];

		self.emit('ready', data);
	};

	///////////////////////////////////////////////////////////////////////////

    document.body.appendChild(script);

	this.__requestIndex++;
    this.data = null;
};

