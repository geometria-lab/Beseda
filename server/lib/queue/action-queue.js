var ActionQueue = function( executor) {
	this.__executor = executor;
	this.__argsQueue = [];
};

ActionQueue.prototype.execAction = function() {
	while (this.__argsQueue.length > 0) {
		this.__executor.execAction(this.__argsQueue.shift());
	}
};

ActionQueue.prototype.enqueue = function(args) {
	this.__argsQueue.push(args);
};

module.exports = ActionQueue;
