var util = require('util');
var crypto = require('crypto');

var Protocol = require('./protocol.js');

var Draft = function() {
	Protocol.call(this);

	this.__currentPacket = [];
	this.__currentFrame = null;
}

util.inherits(Draft, Protocol);

Draft.prototype.handshake = function(headers, request, head) {
	var key = headers['sec-websocket-key'];
	var sha = crypto.createHash('sha1');
	sha.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");

	try {
		this._stream.write([
			'HTTP/1.1 101 Switching Protocols',
			'Upgrade: websocket',
			'Connection: Upgrade',
			'Sec-WebSocket-Accept: ' + sha.digest('base64')
		].concat('', '').join('\r\n'));

		this._initListeners();
	} catch (error) {
		this._connection.disconnect();
	}
};

Draft.prototype._frame = function(data) {
	var payloadLength = data.length;
	var payloadBytes = 0;
	if (payloadLength > 125 && payloadLength < 65536) {
		payloadBytes = 2;
	} else {
		payloadBytes = 8;
	}

	var frame = new Buffer(2 + payloadBytes + payloadLength);
	frame[0] = 0x80 | 0x01; // text
	if (payloadBytes === 0) {
		frame[1] = payloadLength;
	} else if (payloadBytes === 2) {
		frame[1] = 126;
	} else if (payloadBytes === 8) {
		frame[1] = 127;
	}

	var i = 1 + payloadBytes;
	while (i > 1) {
		frame[i] = payloadLength;
		payloadLength >>= 8;
		i--;
	}

	frame.write(data, 2 + payloadBytes);

	return frame;
};

Draft.prototype._collectData = function(chunk) {
	if (this.__currentFrame === null) {
		this.__currentFrame = new ProtocolFrame();
	}

	this.__currentFrame.appendChunk(chunk);

	if (this.__currentFrame.isReady) {
		this.__currentPacket
			= this.__currentPacket.concat(this.__currentFrame.flush());

		if (this.__currentFrame.isFinal) {
			this._connection.handleData(this.__flush());
		}

		var rest = this.__currentFrame.getRest();
		if (rest !== null) {
			this.__currentFrame = new ProtocolFrame();
			this.__currentFrame.appendChunk(rest);
		} else {
			this.__currentFrame = null;
		}
	}
};

Draft.prototype.__flush = function() {
	var result = this.__currentPacket.join('');
	this.__currentPacket.length = 0;
	return result;
};

module.exports = Draft;

var ProtocolFrame = function() {
	this.isFinal = false;
	this.isReady = false;

	this.__payloadLength = 0;
	this.__baseLength = 0;
	this.__totalLength = 0;

	this.__hasMask = false;
	this.__mask = null;

	this.__bytesLoaded = 0;

	this.__chunkBuffer = [];

	this.__rest = null;
};

ProtocolFrame.MASK_LENGTH = 4;

ProtocolFrame.prototype.appendChunk = function(chunk) {
	var isFirstChunk = this.__chunkBuffer.length === 0;
	if (isFirstChunk) {
		this.__baseLength = 2;
		this.isFinal = (chunk[0] & 0x80) === 0x80;
	}

	console.log(chunk.length);

	this.__chunkBuffer.push(chunk);
	this.__bytesLoaded += chunk.length;

	if (this.__payloadLength === 0) {
		var lengthByte = this.__getByteAt(1, isFirstChunk && chunk.length > 1);
		if (lengthByte !== null) {
			this.__hasMask = (lengthByte & 0x80) === 0x80;

			lengthByte &= 127;
			
			var lengthSize = 0;
			if (lengthByte === 127) {
				lengthSize = 8;
			} else if (lengthByte === 126) {
				lengthSize = 2;
			} else {
				this.__payloadLength = lengthByte;
			}

			this.__baseLength += lengthSize;
			if (this.__bytesLoaded > this.__baseLength &&
				this.__payloadLength === 0) {

				var i = 2,
					l = this.__baseLength;

				while (i < l) {
					if (i > 2) {
						this.__payloadLength <<= 8;
					}

					this.__payloadLength |= this.__getByteAt(i++, isFirstChunk);
				}
			}
		}
	}

	if (this.__payloadLength !== 0) {
		if (this.__mask === null && this.__hasMask) {
			var maskOffset = this.__baseLength;
			this.__baseLength += ProtocolFrame.MASK_LENGTH;
			if (isFirstChunk && chunk.length >= this.__baseLength) {
				this.__mask = chunk.slice(maskOffset, this.__baseLength);
			} else {
				// It will never happen...
				this.__mask = new Buffer(ProtocolFrame.MASK_LENGTH);
				var i = maskOffset;
				while (i < this.__baseLength) {
					this.__mask[i - maskOffset] = this.__getByteAt(i++);
				}
			}
		}

		if (this.__totalLength === 0) {
			this.__totalLength = this.__baseLength + this.__payloadLength;
		}

		this.isReady = this.__bytesLoaded >= this.__totalLength;
	}
};

ProtocolFrame.prototype.__getByteAt = function(index, isUnsafe) {
	if (isUnsafe) {
		return this.__chunkBuffer[0][index];
	} else if (this.__bytesLoaded > index) {
		var i = 0,
			l = this.__chunkBuffer.length;

		var chunkIndex = index;
		while (i < l) {
			if (chunkIndex < this.__chunkBuffer[i].length) {
				return this.__chunkBuffer[i][chunkIndex];
			}

			chunkIndex -= this.__chunkBuffer[i].length;

			i++;
		}
	}

	return null;
};

ProtocolFrame.prototype.flush = function() {
	this.__chunkBuffer[0] = this.__chunkBuffer[0].slice(this.__baseLength);

	if (this.__bytesLoaded > this.__totalLength) {
		var lastChunkIndex = this.__chunkBuffer.length - 1;
		var lastByteIndex = this.__chunkBuffer[lastChunkIndex].length -
								this.__bytesLoaded + this.__totalLength;

		this.__rest = this.__chunkBuffer[lastChunkIndex].slice(lastByteIndex);
		this.__chunkBuffer[lastChunkIndex]
			= this.__chunkBuffer[lastChunkIndex].slice(0, lastByteIndex);
	}

	this.__unmask();

	return this.__chunkBuffer;
};

ProtocolFrame.prototype.__unmask = function() {
	if (this.__mask !== null) {
		var i = 0, il = this.__chunkBuffer.length;
		var j, jl;

		var c = 0;
		var buffer = null;
		while (i < il) {
			buffer = this.__chunkBuffer[i++];
			j = 0, jl = buffer.length;

			while (j < jl) {
				buffer[j++] ^= this.__mask[c++ % 4];
			}
		}
	}
};

ProtocolFrame.prototype.getRest = function() {
	return this.__rest;
};

ProtocolFrame.prototype.getPayloadLength = function() {
	return this.__payloadLength;
};