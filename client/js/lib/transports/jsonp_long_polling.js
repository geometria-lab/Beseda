Beseda.JSONPLongPolling = function() {
	Beseda.JSONPLongPolling._super.constructor.call(this);
	
	this._dataType = 'jsonp';
	this._typeSuffix = '/jsonp-polling';
	this._getParams = '?callback=?';
};

Beseda.utils.inherits(Beseda.JSONPLongPolling, Beseda.LongPolling);
