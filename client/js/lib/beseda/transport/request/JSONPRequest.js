/**
 * @constructor
 * @extends beseda.events.EventEmitter
 */
beseda.transport.request.JSONPRequest = function() {
    beseda.events.EventEmitter.prototype.constructor.call(this);

    this.url = null;
    this.data = '';

    this.__id = ++beseda.transport.request.JSONPRequest.__lastID;
    this.__requestIndex = 0;
};

beseda.utils.inherits(beseda.transport.request.JSONPRequest, beseda.events.EventEmitter);

beseda.transport.request.JSONPRequest.__callbacks = {};
beseda.transport.request.JSONPRequest.__lastID = 0;

beseda.transport.request.JSONPRequest.ERROR_TIMEOUT = 15000;

/**
 *
 * @param {string=} url
 */
beseda.transport.request.JSONPRequest.prototype.send = function(url) {
    if (url) {
        this.url = url;
    }

	var script = document.createElement('script');
	script.id = 'request_' + this.__id + '_' + this.__requestIndex;

    var requestURL = this.url + '/' + (new Date().getTime()) +
        '?callback=beseda.transport.request.JSONPRequest.__callbacks["' +
            script.id + '"]&messages=' + this.data;

	script.src = requestURL;

	///////////////////////////////////////////////////////////////////////////

	var self = this;
	var timeout = setTimeout(function() {
		clearTimeout(timeout);

		document.body.removeChild(script);

		delete beseda.transport.request.JSONPRequest.__callbacks[script.id];

		self.emit('error');
	}, beseda.transport.request.JSONPRequest.ERROR_TIMEOUT);

	beseda.transport.request.JSONPRequest.__callbacks[script.id] = function(data) {
		clearTimeout(timeout);

		document.body.removeChild(script);

		delete beseda.transport.request.JSONPRequest.__callbacks[script.id];

		self.emit('ready', data);
	};

	///////////////////////////////////////////////////////////////////////////

    document.body.appendChild(script);

	this.__requestIndex++;
    this.data = null;
};

