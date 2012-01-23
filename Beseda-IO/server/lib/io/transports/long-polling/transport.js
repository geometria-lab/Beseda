var util = require('util');
var protocol = require('../protocol');

var IO = require('../transport.js');
var Connection = require('./connection.js');

var INIT_PROCESS_INTERVAL = 100;

var FlushArguments = function(id) {
	this.id = id;
};

var LongPollingIO = function() {
	IO.call(this);

	this.__isRunning = false;
	this.__processConnections = this.__processConnections.bind(this);
};

util.inherits(LongPollingIO, IO);

LongPollingIO.prototype.create = function(type) {
	var id = IO.prototype.create.call(this, type);

	if (!this.__isRunning) {
		this.__startLoop();
	}

	return id;
};

LongPollingIO.prototype._createConnection = function(type) {
	var connection = new Connection();
	connection.setProtocol(new protocol.JSON());
	return connection;
};

LongPollingIO.prototype.flush = function(id) {
	this._expectNextTick(new FlushArguments(id));
};

LongPollingIO.prototype.execAction = function(args) {
	IO.prototype.execAction.call(this, args);
	
	if (args instanceof FlushArguments) {
		this.__doFlush(args.id);
	}
};

LongPollingIO.prototype.__doFlush = function(id) {
	if (this._connections[id] !== undefined) {
		this._connections[id].flush();
	}
};

LongPollingIO.prototype.__startLoop = function() {
	this.__isRunning = true;
	setTimeout(this.__processConnections, INIT_PROCESS_INTERVAL);
};

LongPollingIO.prototype.__processConnections = function() {
	var i = 0,
		t = Date.now();

	for (var id in this._connections) {
		this._connections[id].process();
		i++;
	}

	this.__isRunning = (i !== 0);

	if (this.__isRunning) {
		var timeout = Math.ceil(Math.sqrt(i) * 2.5) + Date.now() - t;
		setTimeout(this.__processConnections, timeout);
	};
};

module.exports = LongPollingIO;
