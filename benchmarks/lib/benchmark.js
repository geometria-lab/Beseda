var events = require('events');
var util = require('util');
var Step = require('./step.js');
var Table = require('./cli-table');

var Benchmark = function(options) {
	events.EventEmitter.call(this);

	this.name = null;

	this.__children = [];
	this.__currentIndex = 0;

	this.__handleFinish = this.__handleFinish.bind(this);

	if (options) {

		for (var name in options.benchmarks) {
			var bench = new Benchmark();
			bench.name = name;

			var defaults = options.benchmarks[name].defaults;
			var steps = options.benchmarks[name].steps;
			for (var i in steps) {


				bench.add(new Step(steps[i], defaults));
			}
			
			this.add(bench);
		}


		var table = new Table({
			head: ['subscribers', 'time', 'lost', 'errors'],
			colWidths: [15, 15, 15, 15],
			colAligns: 'center'
		});

		console.log(table.toString());
	}
};

util.inherits(Benchmark, events.EventEmitter);

Benchmark.prototype.getResults = function() {
	var results = [];

	for (var i in this.__children) {
		results.push(this.__children[i].getResults());
	}

	if (this.name) {
		return { name: this.name, data: results };
	}

	return results;
};

Benchmark.prototype.getOptions = function() {
	var options = [];

	for (var i in this.__children) {
		options.push(this.__children[i].getOptions());
	}
	
	if (this.name) {
		return { name: this.name, data: options };
	}

	return options;
};

Benchmark.prototype.run = function() {
	this.__runNext();
};

Benchmark.prototype.add = function(child) {
	this.__children.push(child);
};

Benchmark.prototype.__runNext = function() {
	if (this.__currentIndex < this.__children.length) {
		var oldIndex = this.__currentIndex;

		this.__currentIndex++;

		this.__children[oldIndex].once('finish', this.__handleFinish);
		this.__children[oldIndex].run();
	} else {
		this.emit('finish', this.__results);
	}
};

Benchmark.prototype.__handleFinish = function(result) {
	this.__runNext();
};

module.exports = Benchmark;