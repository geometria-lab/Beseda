/**
 * @constructor
 * @extends BesedaPackage.events.EventEmitter
 */
BesedaPackage.IO = function(options) {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this.__options = options;

    this.__transport = BesedaPackage.Transport.getBestTransport(options);
    this.__transport.setEmitter(this);
};

BesedaPackage.utils.inherits(BesedaPackage.IO, BesedaPackage.events.EventEmitter);

BesedaPackage.IO.prototype.connect = function(host, port, ssl) {
	if (host !== undefined) this.__options.host = host;
	if (port !== undefined) this.__options.port = port;
	if (ssl  !== undefined) this.__options.ssl = ssl;

    this.__transport.connect(
	    this.__options.host,
	    this.__options.port,
	    this.__options.ssl
    );
};

BesedaPackage.IO.prototype.send = function(messages) {
	this.__transport.send([].concat(messages));
};

BesedaPackage.IO.prototype.disconnect = function() {
    this.__transport.disconnect();
};
