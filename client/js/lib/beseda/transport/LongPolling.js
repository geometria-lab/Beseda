/**
 * @constructor
 * @extends BesedaPackage.Transport
 */
BesedaPackage.transport.LongPolling = function(xDomain) {
    BesedaPackage.Transport.prototype.constructor.call(this, xDomain);

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

BesedaPackage.utils.inherits(BesedaPackage.transport.LongPolling, BesedaPackage.Transport);

BesedaPackage.transport.LongPolling.isAvailable = function(options, xDomain) {
    return !!BesedaPackage.transport.request.XHRRequest.createRequest(xDomain);
};

BesedaPackage.transport.LongPolling.prototype.__initClosuredHandlers = function() {
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

BesedaPackage.transport.LongPolling.prototype._initRequests = function() {
	// TODO: Use only two requests: send and data
    this._openRequest  = new BesedaPackage.transport.request.XHRRequest('GET', this._isXDomain);
    this._dataRequest  = new BesedaPackage.transport.request.XHRRequest('GET', this._isXDomain);
    this._sendRequest  = new BesedaPackage.transport.request.XHRRequest('PUT', this._isXDomain);
    this._closeRequest = new BesedaPackage.transport.request.XHRRequest('DELETE', this._isXDomain);
};

BesedaPackage.transport.LongPolling.prototype._initListeners = function() {
	this._openRequest.addListener('ready', this.__handleOpenClosure);
	this._openRequest.addListener('error', this.__handleCloseClosure);

	this._dataRequest.addListener('ready', this.__handleDataClosure);
	this._dataRequest.addListener('error', this.__handleCloseClosure);
}

BesedaPackage.transport.LongPolling.prototype._initURLs = function(id) {
	this._sendRequest.url =
    this._dataRequest.url =
    this._closeRequest.url =
        this._url + "/" + this._typeSuffix + "/" + id;
};

BesedaPackage.transport.LongPolling.prototype.connect = function(host, port, ssl) {
    this._url = 'http' + (ssl ? 's' : '') + '://' +
	            host + (port ? ':' + port : '') +
	            '/beseda/io';

    this._openRequest.send(this._url + "/" + this._typeSuffix);
};

BesedaPackage.transport.LongPolling.prototype._handleOpen = function(connectionData) {
	/**
	 * @type {{ connectionId: string }}
	 */
    var data = this._decodeData(connectionData);

	this._isConnected = true;

	this._initURLs(data.connectionId);

    BesedaPackage.Transport.prototype._handleConnection.call(this, data.connectionId);

    this.__poll();
};

BesedaPackage.transport.LongPolling.prototype._doSend = function(data) {
	this._sendRequest.data = data;
    this._sendRequest.send();
};

BesedaPackage.transport.LongPolling.prototype.disconnect = function() {
    this._closeRequest.send();
	this._isConnected = false;
};

BesedaPackage.transport.LongPolling.prototype._handleData = function(data) {
    BesedaPackage.Transport.prototype._handleMessages.call(this, this._decodeData(data));

    this.__poll();
};

BesedaPackage.transport.LongPolling.prototype.__poll = function() {
    if (this._isConnected) {
        this._dataRequest.send();
    }
};