

/**
 * @constructor
 * @extends BesedaPackage.transport.LongPolling
 */
BesedaPackage.transport.JSONPLongPolling = function() {
    BesedaPackage.transport.LongPolling.prototype.constructor.call(this);

    this._typeSuffix = 'JSONPLongPolling';
};

BesedaPackage.utils.inherits(BesedaPackage.transport.JSONPLongPolling, BesedaPackage.transport.LongPolling);

BesedaPackage.transport.JSONPLongPolling.isAvailable = function(options) {
    return true;
};

BesedaPackage.transport.JSONPLongPolling.prototype._initRequests = function() {
    this._openRequest  = new BesedaPackage.transport.request.JSONPRequest();
    this._dataRequest  = new BesedaPackage.transport.request.JSONPRequest();
    
    this._sendRequest  = new BesedaPackage.transport.request.JSONPRequest();
    this._closeRequest = new BesedaPackage.transport.request.JSONPRequest();
};

BesedaPackage.transport.JSONPLongPolling.prototype._initURLs = function(id) {
	BesedaPackage.transport.LongPolling.prototype._initURLs.call(this, id);

	this._sendRequest.url  += '/send';
    this._closeRequest.url += '/destroy';
};

BesedaPackage.transport.JSONPLongPolling.prototype._decodeData = function(data) {
    return data;
};
