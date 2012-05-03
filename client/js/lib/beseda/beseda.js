if (besedaPackage === undefined) {
    var besedaPackage = {};
}

var Beseda;

(function() {
     Beseda = function(options) {
		EventEmitter.call(this);

        if ('string' == typeof options) {
            options = { url : options };
        }

        this.__options = {
            'url'              : null,
            'transports'       : [ 'webSocket', 'longPolling', 'JSONPLongPolling' ],
            'reconnectTimeout' : 5000
        };

        for (var name in options) {
            this.__options[name] = options[name];
        }

        this.__status = Beseda.__statuses.DISCONNECTED;
        this.__messageQueue = [];

        this.clientId = null;

        this.__io = new besedaPackage.IO();
        
        var self = this;

        this.__io.on('connection', function(clientId) {
            self.__connection(clientId);
        });

        this.__io.on('message', function(message) {
            self.emit('message', message);
        });

        this.__io.on('error', function() {
            self.__destroy();

            setTimeout(function(){
                self.connect();
            }, self.__options.reconnectTimeout);
        });
	};
    
    besedaPackage.util.inherits(Beseda, EventEmitter);

    Beseda.__statuses = {
        DISCONNECTED : 0,
        CONNECTING   : 1,
        CONNECTED    : 2
    };

	Beseda.prototype.connect = function(url) {
        if (!this.isConnected()) {
        	this.__status = Beseda.__statuses.CONNECTING;

    		this.io.connect(url);
        }
	};

	Beseda.prototype.disconnect = function() {
        this.io.disconnect();
        this.emit('disconnect');
        
        this.__destroy();
	};

	Beseda.prototype.send = function(message) {
        if (this.isDisconnected()) {
            this.connect();
        }

        if (this.isConnecting()) {
            this.__messageQueue.push(message);
        } else {
            this.io.write(message);
        }
	};

    Beseda.prototype.isConnected = function() {
        return this.__status == this.__statuses.CONNECTED;
    };

    Beseda.prototype.isDisconnected = function() {
        return this.__status == this.__statuses.DISCONNECTED;
    };

    Beseda.prototype.isConnecting = function() {
        return this.__status == this.__statuses.CONNECTING;
    };

    Beseda.__connection = function(clientId) {
        this.clientId = clientId;

        this.__status = Beseda.__statuses.CONNECTED;
        
        this.__flushMessageQueue();
    };

    Beseda.prototype.__destroy = function() {
        this.__status = Beseda.__statuses.DISCONNECTED;

        this.clientId = null;

    	this.__messageQueue = [];
    };

    Beseda.prototype.__flushMessageQueue = function() {
        this.io.write(this.__messageQueue);

        this.__messageQueue = [];
    };

    besedaPackage.Beseda = Beseda;
})();