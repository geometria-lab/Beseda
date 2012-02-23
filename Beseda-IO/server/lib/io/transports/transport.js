var queue = require('../../queue');

var DestroyArguments = function(id) {
	this.id = id;
};

var SetInputStreamArguments = function(id, stream) {
	this.id = id;
	this.stream = stream;
};

var SetOutputStreamArguments = function(id, stream) {
	this.id = id;
	this.stream = stream;
};

var WriteArguments = function(id, data) {
	this.id = id;
	this.data = data;
};

var Transport = function() {
	this._connections = {};

	this._asyncQueue = new queue.ActionQueue(this);
	this._execAsync = this._asyncQueue.execAction.bind(this._asyncQueue);

	this.__isNextTickExpected = false;
};

Transport.prototype.create = function(type) {
	var connection = this._createConnection(type);
	connection.setIO(this);

	this._connections[connection.id] = connection;

	return connection.id;
};

Transport.prototype._createConnection = function(type) {};

Transport.prototype._expectNextTick = function(args) {
	this._asyncQueue.enqueue(args);
	
	if (!this.__isNextTickExpected) {
		this.__isNextTickExpected = true;
		process.nextTick(this._execAsync);
	}
};

Transport.prototype.destroy = function(id) {
	this._expectNextTick(new DestroyArguments(id));
};

Transport.prototype.setInputStream = function(id, stream) {
	stream.pause();
	this._expectNextTick(new SetInputStreamArguments(id, stream));
};

Transport.prototype.setOutputStream = function(id, stream) {
	this._expectNextTick(new SetOutputStreamArguments(id, stream));
};

Transport.prototype.write = function(id, data) {
	this._expectNextTick(new WriteArguments(id, data));
};

Transport.prototype.execAction = function(args) {
	this.__isNextTickExpected = false;

	if (args instanceof DestroyArguments) {
		this._doDestroy(args.id);
	}

	if (args instanceof SetInputStreamArguments) {
		this._doUpdateInput(args.id, args.stream);
	}

	if (args instanceof SetOutputStreamArguments) {
		this._doUpdateOutput(args.id, args.stream);
	}

	if (args instanceof WriteArguments) {
		this._doWrite(args.id, args.data);
	}
};

Transport.prototype._doDestroy = function(id) {
	if (this._connections[id] !== undefined) {
		this._connections[id].destroy();
		delete this._connections[id];
	}
};

Transport.prototype._doUpdateInput = function(id, stream) {
	if (this._connections[id] !== undefined) {
		this._connections[id].setInputStream(stream);
		stream.resume();
	} else {
		stream.destroy();
	}
};

Transport.prototype._doUpdateOutput = function(id, stream) {
	if (this._connections[id] !== undefined) {
		this._connections[id].setOutputStream(stream);
	} else {
		stream.destroy();
	}
};

Transport.prototype._doWrite = function(id, data) {
	if (this._connections[id] !== undefined) {
		this._connections[id].write(data);
	}
};

Transport.prototype.setReadCallback = function(id, callback) {
	if (this._connections[id] !== undefined) {
		this._connections[id].setReadCallback(callback);
	}
};

Transport.prototype.setErrorCallback = function(id, callback) {
	if (this._connections[id] !== undefined) {
		this._connections[id].setErrorCallback(callback);
	}
};

module.exports = Transport;
