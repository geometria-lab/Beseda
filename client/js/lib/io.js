Beseda.IO = function(options) {
    Beseda.IO._super.constructor.call(this);

    this.__options = options;

    this.__transport = Beseda.Transport.getBestTransport(options);
    this.__transport.setEmitter(this);
};

Beseda.Utils.inherits(Beseda.IO, EventEmitter);

Beseda.IO.prototype.connect = function() {
    this.__transport.connect(this.__options.host,
                             this.__options.port,
                             this.__options.ssl);
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
