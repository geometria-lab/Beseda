/**
 * @constructor
 * @extends beseda.events.EventEmitter
 */
beseda.IO = function(options) {
    beseda.events.EventEmitter.prototype.constructor.call(this);

    this.__options = options;

    this.__transport = beseda.Transport.getBestTransport(options);
    this.__transport.setEmitter(this);
};

beseda.utils.inherits(beseda.IO, beseda.events.EventEmitter);

beseda.IO.prototype.connect = function(host, port, ssl) {
    this.__transport.connect(
	    host || this.__options.host,
	    port || this.__options.port,
	    ssl  || this.__options.ssl
    );
};

beseda.IO.prototype.send = function(messages) {
	this.__transport.send([].concat(messages));
};

beseda.IO.prototype.disconnect = function() {
    this.__transport.disconnect();
};
