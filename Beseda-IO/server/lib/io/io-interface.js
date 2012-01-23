var IIO = function() {};

IIO.prototype.create = function(type) {};
IIO.prototype.destroy = function(id) {};

IIO.prototype.setInputStream = function(id, stream) {};
IIO.prototype.setOutputStream = function(id, stream) {};

IIO.prototype.write = function(id, data) {};
IIO.prototype.setReadCallback = function(id, callback) {};
IIO.prototype.setErrorCallback = function(id, callback) {};

module.exports = IIO;