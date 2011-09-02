var events = require('events');
var util = require('util');

var Benchmark = function() {
	events.EventEmitter.call(this);

	this.__children = [];
	this.__currentIndex = 0;

	this.__handleFinish = this.__handleFinish.bind(this);
};

util.inherits(Benchmark, events.EventEmitter);

Benchmark.prototype.run = function() {
	this.__runNext();
};

Benchmark.prototype.addChild = function(child) {
	this.__children.push(child);
};

Benchmark.prototype.__runNext = function() {
	console.log(this.__currentIndex);

	if (this.__currentIndex < this.__children.length) {
		var oldIndex = this.__currentIndex;
		
		this.__currentIndex++;

		this.__children[oldIndex].once('finish', this.__handleFinish);
		this.__children[oldIndex].run();
	} else {
		this.emit('finish');
	}
};

Benchmark.prototype.__handleFinish = function(result) {
	this.__runNext();
};

module.exports = Benchmark;
