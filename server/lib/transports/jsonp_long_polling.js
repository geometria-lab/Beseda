var util = require('util');

var Router = require('./../router.js');
var LongPollingTransport = require('./long_polling.js');
var JSONPLongPollingConnection = require('./connections/jsonp_long_polling.js');


var JSONPLongPollingTransport = module.exports = function(io) {
	LongPollingTransport.call(this, io);
};

util.inherits(JSONPLongPollingTransport, LongPollingTransport);

JSONPLongPollingTransport.prototype._createConnection = function(id) {
	return new JSONPLongPollingConnection(id);
};

JSONPLongPollingTransport.prototype._initRoutes = function() {
	this._io.server.router.get(
		'/beseda/io/JSONPLongPolling/:id/:time', 
		this._holdRequest.bind(this)
	);
	
    this._io.server.router.get(
		'/beseda/io/JSONPLongPolling/:id/send/:time',
		this._receive.bind(this)
	);
    	
    this._io.server.router.get(
		'/beseda/io/JSONPLongPolling/:id/destroy/:time',
		this._destroy.bind(this)
	);
};

module.exports = JSONPLongPollingTransport;