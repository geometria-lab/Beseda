var util = require('util');

var Step      = require('./step.js'),
    Semaphore = require('./semaphore.js');

var Transport = module.exports = function(benchmark, name, options) {
    process.EventEmitter.call(this);

    this.benchmark = benchmark;
    this.name      = name;
    this.options   = options;

    this._semaphore = new Semaphore(this.benchmark.name + ':transports:' + this.name + ':semaphore',
                                    this.benchmark.createRedisClient(),
                                    this.benchmark.createRedisClient());

    this.steps = [];
    this.currentStep = 0;
    for (var i = 0; i < this.options.steps.length; i++) {
        var step = new Step(this, i, this.options.steps[i]);
        this.steps.push(step);
    }
};

util.inherits(Transport, process.EventEmitter);

Transport.prototype.run = function() {
    this._semaphore.start(this.benchmark.options.node);

    this._runSteps();
};

Transport.prototype._runSteps = function() {
    this.steps[this.currentStep].run();

    this.steps[this.currentStep].on('ready', function() {
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
            this._runSteps();
        } else {
            this._semaphore.reach(this._ready.bind(this));
        }
    }.bind(this));
};

Transport.prototype._ready = function() {
    this.emit('ready');
};