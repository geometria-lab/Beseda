var util = require('util');
var crypto = require('crypto');

var Router = require('./../router.js');

module.exports = WebSocketTransport = function(io) {
	process.EventEmitter.call(this);

	this._io = io;
	this._connections = {};
};

util.inherits(WebSocketTransport, process.EventEmitter);

WebSocketTransport.prototype.createConnection = function(connectionId, request, response, head) {
	this._connections[connectionId] = new WebSocketTransport.Connection(this, connectionId);

	if (!this._connections[connectionId].applyConnection(request, response, head)) {
		delete this._connections[connectionId];
	};
	
	return this._connections[connectionId];
};

WebSocketTransport.Connection = function(transport, id) {
    this.__transport = transport;
    this.id = id;

	this.__connection = null;
	this.__currentMessage = null;
};

WebSocketTransport.Connection.prototype.applyConnection = function(request, response, head) {
	//TODO: Handle slow connection (when head.length less then 8)

	this.__connection = request.connection;

	var headers = [];
	if (request.headers['sec-websocket-key1']) {
		headers = [
			'HTTP/1.1 101 WebSocket Protocol Handshake',
			'Upgrade: WebSocket',
			'Connection: Upgrade',
			'Sec-WebSocket-Origin: ' + request.headers.origin,
			'Sec-WebSocket-Location: ws://' + request.headers.host + request.url
		];
	} else {
		headers = [
			'HTTP/1.1 101 Switching Protocols',
			'Upgrade: WebSocket',
			'Connection: Upgrade'
		];
	}

	var key1 = request.headers['sec-websocket-key1'];
	var key2 = request.headers['sec-websocket-key2'];

	var keys = [key1, key2];

	if (key1 && key2) {
		this.__connection.write(headers.concat('', '').join('\r\n'));

		var md5 = crypto.createHash('md5');

		var numKey;
		var spaceCount;

		var i = 0;
		while(i < 2) {
			numKey = parseInt(keys[i].replace(/[^\d]/g, ''));
			spaceCount = keys[i].replace(/[^ ]/g, '').length;

			numKey /= spaceCount;

			//TODO: Concat at first, then update
			md5.update(String.fromCharCode(
				numKey >> 24 & 0xFF,
				numKey >> 16 & 0xFF,
				numKey >> 8  & 0xFF,
				numKey       & 0xFF
			));

			++i;
		}

		md5.update(head.toString('binary'));

		this.__connection.write(md5.digest('binary'), 'binary');
		this.__connection.setTimeout(0);
		this.__connection.setNoDelay(true);
		this.__connection.setEncoding('utf-8');
	} else {

		var key = request.headers['sec-websocket-key'];
		key += '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

		var sha1 = crypto.createHash('sha1');
		sha1.update(key)
		
		headers.push('Sec-WebSocket-Accept: ' + sha1.digest('base64'));
		headers.push('Sec-WebSocket-Protocol: chat');
		console.log(headers);

		this.__connection.write(headers.concat('', '').join('\r\n'));
		this.__connection.setTimeout(0);
		this.__connection.setNoDelay(true);
		this.__connection.setEncoding('utf-8');
	}

	var self = this;
	this.__connection.addListener('data', this.__collectData.bind(this));

	//TODO: rework!
	this.__connection.addListener('end', function() {
		self.__transport.emit('disconnect', self.id);
		delete self.__transport._connections[self.id]
	});

	this.__rawSend({ 'connectionId' : this.id });

	return true;
};

WebSocketTransport.Connection.prototype.__collectData = function(data) {
	var i = 0;
	while (i < data.length) {

		if (data[i] === '\u0000') {
			if (this.__currentMessage) {
				this.__transport.emit('error', this.id, 'bad framing');
			} else {
				this.__currentMessage = [];
			}
		} else if (data[i] === '\ufffd') {
			if (this.__currentMessage) {
				// MESSAGE
				var message = this.__currentMessage.join('');

				try {
					//TODO: Collect messages in one chunk of data and emit array
					this.__transport.emit('message', this.id, JSON.parse(message));
				} catch (error) {}

				this.__currentMessage = null;
			} else {
				//this.__transport.emit('error', this.id, 'bad framing');
			}
		} else {
			if (this.__currentMessage) {
				this.__currentMessage.push(data[i]);
			} else {
				//this.__transport.emit('error', this.id, 'bad framing');
			}
		}

		i++;
	}
};

WebSocketTransport.Connection.prototype.send = function(data) {
	this.__rawSend([data]);
};

WebSocketTransport.Connection.prototype.__rawSend = function(data) {
	try {
		this.__connection.write('\u0000', 'binary');
		this.__connection.write(JSON.stringify(data), 'utf-8');
		this.__connection.write('\uffff', 'binary');
	} catch (e) {
		// TODO: Rework!
		this.__transport.emit('disconnect', this.id);
		delete this.__transport._connections[this.id];
	}
};
