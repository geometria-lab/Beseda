Beseda.Transport.WebSocket = function() {
	Beseda.Transport.WebSocket._super.constructor.call(this);

	this.__ws = null;
	this._typeSuffix = 'webSocket';

	this.__signed = true;
	this.__pendingIDs = [];

	var self = this;

	this.__handleConnectClosure = function(event) {
		self.__handleConnect(event);
	};

	this.__handleMessageClosure = function(event) {
		self.__handleMessage(event);
	};

	this.__handleErrorClosure = function(event) {
		self.__handleError(event);
	};

	this.__handleDisconnectClosure = function(event) {
		self.__handleDisconnect(event);
	};
};

Beseda.Utils.inherits(Beseda.Transport.WebSocket, Beseda.Transport);

Beseda.Transport.WebSocket.isAvailable = function(options) {
	return false;//!!window.WebSocket;
};

Beseda.Transport.WebSocket.prototype.connect = function(host, port, ssl) {

	this.__ws = new WebSocket(
		'ws' + (ssl ? 's' : '') + '://' +
		host + (port ? ':' + port : '') +
		'/beseda/io/' + this._typeSuffix + '/' +
		(new Date().getTime())
	);

	this.__ws.addEventListener('open', this.__handleConnectClosure);
	this.__ws.addEventListener('message', this.__handleMessageClosure);
	this.__ws.addEventListener('error', this.__handleErrorClosure);
	this.__ws.addEventListener('close', this.__handleDisconnectClosure);
};

Beseda.Transport.WebSocket.prototype.send = function(data, ids) {
	this.__ws.send(data);
	this.__pendingIDs.concat(ids);
};

Beseda.Transport.WebSocket.prototype.disconnect = function() {
	this._connectionID = null;
	this.disconnect();
};

Beseda.Transport.WebSocket.prototype.__handleConnect = function(event) {
	this.__signed = false;
};

Beseda.Transport.WebSocket.prototype.__handleMessage = function(event) {
	var data = event.data;

	console.log(data);

	try {
		data = JSON.parse(event.data);
	} catch (error) {}

	if (!this.__signed) {
		if (data) {
			var id = data.connectionId;

			Beseda.Transport.WebSocket._super._handleConnection.call(this, id);

			this.__signed = true;
		}
	} else {
		if (data) {
			var i = data.length - 1;
			while (i >= 0) {
				this.__pendingIDs.splice(this.__pendingIDs.indexOf(data[i].id), 1);
				i--;
			}

			Beseda.Transport.WebSocket._super._handleMessage.call(this, data);
		}
	}
};

Beseda.Transport.WebSocket.prototype.__emitError = function(error) {
	var i = this.__pendingIDs.length - 1;

    while (i >= 0) {
        self._emitter.emit('message:' + this.__pendingIDs[i], error);

        i--;
    }

	this._emitter.emit('error');
}

Beseda.Transport.WebSocket.prototype.__handleError = function(event) {
	this.__emitError(event);

	this.__ws.close();
	this.__ws = null;
};

Beseda.Transport.WebSocket.prototype.__handleDisconnect = function(event) {
	this.__emitError(event);

	this.__ws.close();
	this.__ws = null;
};


