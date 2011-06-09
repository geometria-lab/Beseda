var util = require('util');

var Step      = require('./step.js'),
    Semaphore = require('./semaphore.js');

var Transport = module.exports = function(benchmark, name, options) {
    process.EventEmitter.call(this);

    this.benchmark = benchmark;
    this.name      = name;
    this.options   = options;

    this._semaphore = new Semaphore(this.benchmark.name + ':transports:' + this.name + ':semaphore',
                                    this.benchmark.options.node,
                                    this.benchmark.createRedisClient(),
                                    this.benchmark.redis);

    this.steps = [];
    this.currentStep = 0;
    for (var i = 0; i < this.options.steps.length; i++) {
        var step = new Step(this, i, this.options.steps[i]);
        this.steps.push(step);
    }
};

util.inherits(Transport, process.EventEmitter);

Transport.prototype.run = function() {
    this._runSteps();
};

Transport.prototype.getResults = function() {
    if (!this._ready) {
        throw new Error('Run before');
    }

    var results = [];
    for (var i = 0; i < this.steps.length; i++) {
        results.push(this.steps[i].getResults());
    }

    return results;
};

Transport.prototype._runSteps = function() {
    this.steps[this.currentStep].run();

    this.steps[this.currentStep].on('ready', function() {
        console.log('Стэп готов')
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
            console.log('Иду на следующий')
            this._runSteps();
        } else {
            console.log('Жду пока все закончат стэпы')
            this._semaphore.reach(this._ready.bind(this));
        }
    }.bind(this));
};

Transport.prototype._ready = function() {
    this._ready = true;
    this.emit('ready');
};