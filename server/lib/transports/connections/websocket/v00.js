var util = require('util');
var crypto = require('crypto');

var Protocol = require('./protocol.js');

var Version00 = function() {
	Protocol.call(this);

	this.__currentMessage = null;
}

util.inherits(Version00, Protocol);

Version00.prototype.handshake = function(request, head) {
    var location = 'ws://' + request.headers.host + request.url;

    if (request.headers['sec-websocket-key1']) {
        var headers = [
            'HTTP/1.1 101 WebSocket Protocol Handshake',
            'Upgrade: WebSocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Origin: ' + request.headers.origin,
            'Sec-WebSocket-Location: ' + location
        ];

        if (request.headers['sec-websocket-protocol']){
            headers.push('Sec-WebSocket-Protocol: ' + request.headers['sec-websocket-protocol']);
        }
    } else {
        var headers = [
            'HTTP/1.1 101 Web Socket Protocol Handshake',
            'Upgrade: WebSocket',
            'Connection: Upgrade',
            'WebSocket-Origin: ' + request.headers.origin,
            'WebSocket-Location: ' + location
        ];
    }

    try {
        this._stream.write(headers.concat('', '').join('\r\n'));
    } catch (error) {
        return this._connection.disconnect();
    }

    if (request.headers['sec-websocket-key1']) {
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
            this._stream.write(md5.digest('binary'), 'binary');
        } catch (error) {
            return this._connection.disconnect();
        }
    }

    this._initListeners();
};

Version00.prototype._frame = function(data) {
	var frame = new Buffer(data.length + 2);
	frame[0] = '\u0000';
	frame.write(data, 1);
	frame[frame.length - 1] = '\uffff';

	return frame;
};

Version00.prototype._collectData = function(chunk) {
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

module.exports = Version00;