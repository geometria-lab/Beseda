/**
 * @constructor
 * @extends beseda.Transport
 */
beseda.transport.LongPolling = function() {
    beseda.Transport.prototype.constructor.call(this);

    this._typeSuffix = 'longPolling';

	this._url = null;

    this._openRequest  = null;
    this._dataRequest  = null;
    this._sendRequest  = null;
    this._closeRequest = null;

	this.__handleOpenClosure = null;
	this.__handleDataClosure = null;
	this.__handleCloseClosure = null;

	this.__initClosuredHandlers();

	this._initRequests();
	this._initListeners();
};

beseda.utils.inherits(beseda.transport.LongPolling, beseda.Transport);

beseda.transport.LongPolling.isAvailable = function(options) {
    return document.location.hostname === options.host;
};

beseda.transport.LongPolling.prototype.__initClosuredHandlers = function() {
	var self = this;

    this.__handleOpenClosure = function(data) {
        self._handleOpen(data);
    };

    this.__handleDataClosure = function(data) {
        self._handleData(data);
    };

    this.__handleCloseClosure = function(data) {
        self._handleError(data);
    };
};

beseda.transport.LongPolling.prototype._initRequests = function() {
	// TODO: Use only two requests: send and data
    this._openRequest  = new beseda.transport.request.XHRRequest('GET');
    this._dataRequest  = new beseda.transport.request.XHRRequest('GET');
    this._sendRequest  = new beseda.transport.request.XHRRequest('PUT');
    this._closeRequest = new beseda.transport.request.XHRRequest('DELETE');
};

beseda.transport.LongPolling.prototype._initListeners = function() {
	this._openRequest.addListener('ready', this.__handleOpenClosure);
	this._openRequest.addListener('error', this.__handleCloseClosure);

	this._dataRequest.addListener('ready', this.__handleDataClosure);
	this._dataRequest.addListener('error', this.__handleCloseClosure);
}

beseda.transport.LongPolling.prototype._initURLs = function(id) {
	this._sendRequest.url =
    this._dataRequest.url =
    this._closeRequest.url =
        this._url + "/" + this._typeSuffix + "/" + id;
};

beseda.transport.LongPolling.prototype.connect = function(host, port, ssl) {
    this._url = 'http' + (ssl ? 's' : '') + '://' +
	            host + (port ? ':' + port : '') +
	            '/beseda/io';

    this._openRequest.send(this._url + "/" + this._typeSuffix);
};

beseda.transport.LongPolling.prototype._handleOpen = function(connectionData) {
	/**
	 * @type {{ connectionId: string }}
	 */
    var data = this._decodeData(connectionData);

	this._isConnected = true;

	this._initURLs(data.connectionId);

    beseda.Transport.prototype._handleConnection.call(this, data.connectionId);

    this.__poll();
};

beseda.transport.LongPolling.prototype._doSend = function(data) {
	this._sendRequest.data = data;
    this._sendRequest.send();
};

beseda.transport.LongPolling.prototype.disconnect = function() {
    this._closeRequest.send();
	this._isConnected = false;
};

beseda.transport.LongPolling.prototype._handleData = function(data) {
    beseda.Transport.prototype._handleMessages.call(this, this._decodeData(data));

    this.__poll();
};

beseda.transport.LongPolling.prototype.__poll = function() {
    if (this._isConnected) {
        this._dataRequest.send();
    }
};