var JSONProtocol  = function() {
	this.__currentFrameBuffer = [];
};

JSONProtocol.prototype.appendChunk = function(chunk) {
	this.__currentFrameBuffer.push(chunk);
};

JSONProtocol.prototype.flush = function() {
	var frame = this.__currentFrameBuffer.join('');
	this.__currentFrameBuffer.length = 0;

	var data = null;

	try {
		data = JSON.parse(frame);
	} catch (error) {}

	return data;
};

JSONProtocol.prototype.encodeData = function(data) {
	return JSON.stringify(data);
};

module.exports = JSONProtocol;