var transports = require('./transports');

var IO = function() {
	this.__longPolling = new transports.longPolling.Transport();
};

IO.prototype.create = function(type) {
	return this.__longPolling.create(type);
};

IO.prototype.destroy = function(id) {
	this.__longPolling.destroy(id);
};

IO.prototype.setInputStream = function(id, stream) {
	this.__longPolling.setInputStream(id, stream);
};

IO.prototype.setOutputStream = function(id, stream) {
	this.__longPolling.setOutputStream(id, stream);
};

IO.prototype.write = function(id, data) {
	this.__longPolling.write(id, data);
};

IO.prototype.setReadCallback = function(id, callback) {
	this.__longPolling.setReadCallback(id, callback);
};

IO.prototype.setErrorCallback = function(id, callback) {
	this.__longPolling.setErrorCallback(id, callback);
};

module.exports = IO;