Beseda.IO = function(options) {
    Beseda.IO._super.constructor.call(this);

    this.__options = options;

    this.__transport = Beseda.Transport.getBestTransport(options);
    this.__transport.setEmitter(this);
};

Beseda.Utils.inherits(Beseda.IO, EventEmitter);

Beseda.IO.prototype.connect = function(host, port, ssl) {
	host = host && host.length !== 0 ? host : this.__options.host;
	port = !isNaN(port)              ? port : this.__options.port;
	ssl  = ssl !== undefined         ? ssl  : this.__options.ssl;

    this.__transport.connect(host, port, ssl);
};

Beseda.IO.prototype.send = function(messages) {
    var dataArray = [].concat(messages);

    var ids = [];
    for (var i = 0; i < dataArray.length; i++) {
        ids.push(dataArray[i].id);
    }

    this.__transport.send(JSON.stringify(dataArray), ids);
};

Beseda.IO.prototype.disconnect = function() {
    this.__transport.disconnect();
};
