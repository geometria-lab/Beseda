var JSONPLongPolling = function() {
	JSONPLongPolling._super.constructor.call(this);
	
	this._dataType = 'jsonp';
	this._typeSuffix = '/jsonp-polling';
	this._getParams = '?callback=?';
};

Beseda.inherits(JSONPLongPolling, LongPolling);
