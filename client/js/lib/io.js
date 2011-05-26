Beseda.IO = function(options) {
    Beseda.IO._super.constructor.call(this);

    this.__options = options;

    this.__transport = Beseda.Transport.getBestTransport(options);
    this.__transport.setEmitter(this);
};

Beseda.Utils.inherits(Beseda.IO, EventEmitter);

Beseda.IO.prototype.connect = function(host, port, ssl) {
    this.__transport.connect(
	    host || this.__options.host,
	    port || this.__options.port,
	    ssl  || this.__options.ssl
    );
};

Beseda.IO.prototype.send = function(messages) {
	this.__transport.send([].concat(messages));
};

Beseda.IO.prototype.disconnect = function() {
    this.__transport.disconnect();
};
