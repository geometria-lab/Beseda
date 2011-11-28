var util = require('util');
var crypto = require('crypto');

var Protocol = require('./protocol.js');

var Draft = function() {
	Protocol.call(this);

	this.__currentMessage = null;
}

util.inherits(Draft, Protocol);

Draft.prototype.handshake = function(headers, request, head) {
	var keys = [
		request.headers['sec-websocket-key1'],
		request.headers['sec-websocket-key2']
	];

	var md5 = crypto.createHash('md5');

	var i = 0;
	var num;
	while(i < 2) {
		num = parseInt(keys[i].replace(/[^\d]/g, '')) /
				keys[i].replace(/[^ ]/g, '').length;

		md5.update(String.fromCharCode(
			num >> 24 & 0xFF,
			num >> 16 & 0xFF,
			num >> 8  & 0xFF,
			num       & 0xFF
		));

		i++;
	}

	md5.update(head.toString('binary'));

	try {
		this._stream.write([
				'HTTP/1.1 101 WebSocket Protocol Handshake',
				'Upgrade: WebSocket',
				'Connection: Upgrade',
				'Sec-WebSocket-Origin: ' + headers.origin,
				'Sec-WebSocket-Location: ws://' + headers.host + request.url
		]);

		this._stream.write(md5.digest('binary'), 'binary');

		this.__initListeners();
	} catch (error) {
		this._connection.disconnect();
	}
};

Draft.prototype._frame = function(data) {
	var frame = new Buffer(data.length + 2);
	frame[0] = '\u0000';
	frame.write(data, 1);
	frame[frame.length - 1] = '\uffff';

	return frame;
};

Draft.prototype._collectData = function(chunk) {
	var i = 0;
	while (i < chunk.length) {
		if (chunk[i] === '\u0000') {
			this.__currentMessage = [];
		} else if (chunk[i] === '\ufffd') {
			if (this.__currentMessage !== null) {
				this._connection.handleData(this.__currentMessage.join(''));

				this.__currentMessage = null;
			}
		} else if (this.__currentMessage !== null) {
			this.__currentMessage.push(chunk[i]);
		}

		i++;
	}
};

module.exports = Draft;