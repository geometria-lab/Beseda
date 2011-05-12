
Beseda.JSONPLongPolling = function() {
	Beseda.JSONPLongPolling._super.constructor.call(this);
	
	this._dataType = 'jsonp';
	this._typeSuffix = '/jsonp-polling';
};

Beseda.utils.inherits(Beseda.JSONPLongPolling, Beseda.LongPolling);

Beseda.JSONPLongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.JSONPRequest();
	this._pollRequest = new Beseda.JSONPRequest();
	
	this._sendRequest = new Beseda.Request();
	this._sendRequest.method = 'POST';
};
