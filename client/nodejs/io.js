var util = require('util');

var utils = require('./../../server/lib/utils.js');

var Transport = require('./transport.js');

module.exports = IO = function(options) {
    process.EventEmitter.call(this);

	this.__options = options;

	this.__transport = new Transport.getTransport(options);
	this.__transport.setEmitter(this);
};

util.inherits(IO, process.EventEmitter);

IO.prototype.connect = function() {
	this.__transport.connect(this.__options.host,
							 this.__options.port,
							 this.__options.ssl);
};

IO.prototype.send = function(messages) {
	this.__transport.send([].concat(messages));
};

IO.prototype.disconnect = function() {
	this.__transport.disconnect();
};
