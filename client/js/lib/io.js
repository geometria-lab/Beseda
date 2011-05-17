Beseda.IO = function(options) {
	Beseda.IO._super.constructor.call(this);

	this.__options = options;

	this.__transport = Beseda.Transport.getBestTransport(options);
	this.__transport.setEmitter(this);
};

Beseda.utils.inherits(Beseda.IO, Beseda.EventEmitter);

Beseda.IO.prototype.connect = function() {
	this.__transport.connect(this.__options.host,
							 this.__options.port,
							 this.__options.ssl);
};

Beseda.IO.prototype.send = function(data) {
	var dataArray = [].concat(data);
	
	this.__transport.send(JSON.stringify(dataArray));
};

Beseda.IO.prototype.disconnect = function() {
	this.__transport.disconnect();
};
