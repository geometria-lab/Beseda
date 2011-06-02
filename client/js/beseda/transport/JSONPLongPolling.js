/**
 * @constructor
 * @extends beseda.transport.LongPolling
 */
beseda.transport.JSONPLongPolling = function() {
    beseda.transport.LongPolling.prototype.constructor.call(this);

    this._typeSuffix = 'JSONPLongPolling';
};

beseda.utils.inherits(beseda.transport.JSONPLongPolling, beseda.transport.LongPolling);

beseda.transport.JSONPLongPolling.isAvailable = function(options) {
    return true;
};

beseda.transport.JSONPLongPolling.prototype._initRequests = function() {
    this._openRequest  = new beseda.transport.request.JSONPRequest();
    this._dataRequest  = new beseda.transport.request.JSONPRequest();
    
    this._sendRequest  = new beseda.transport.request.JSONPRequest();
    this._closeRequest = new beseda.transport.request.JSONPRequest();
};

beseda.transport.JSONPLongPolling.prototype._initURLs = function(id) {
	beseda.transport.LongPolling.prototype._initURLs.call(this, id);

	this._sendRequest.url  += '/send';
    this._closeRequest.url += '/destroy';
};

beseda.transport.JSONPLongPolling.prototype._decodeData = function(data) {
    return data;
};
