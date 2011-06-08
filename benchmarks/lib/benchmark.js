var redis = require('redis-node');

var Transport = require('./transport.js'),
    Semaphore = require('./semaphore.js');

var Benchmark = module.exports = function(name, options) {
    this.name = name;
    this.options = options;

    var workers = this.options.node - 1;
    if (workers < 1) {
        workers = 1
    }
    this.cluster = require('cluster')().set('workers', workers);
    this.clusterProcess = null;

    this.redis = this.createRedisClient();

    this.transports = [];
    this.currentTransport = 0;

    this._semaphore = new Semaphore(this,
                                    this.name + ':semaphore',
                                    this.options.node);
};

Benchmark.prototype.createRedisClient = function() {
    return redis.createClient(this.options.redis.port, this.options.redis.host);
}

Benchmark.prototype.run = function() {
    this.clusterProcess = this.cluster.start();

    for (var name in this.options.transports) {
        var transportOptions = this.options.transports[name];

        for (var i = 0; i < transportOptions.steps.length; i++) {
            var step = transportOptions.steps[i];

            if (this.cluster.isMaster) {
                step.subscribe = step.subscribe - Math.floor(step.subscribe / this.options.node) * (this.options.node - 1);
                step.publish = step.publish - Math.floor(step.publish / this.options.node) * (this.options.node - 1);
            } else {
                step.subscribe = Math.ceil(step.subscribe / this.options.node);
                step.publish = Math.ceil(step.publish / this.options.node);
            }
        }

        var transport = new Transport(this, name, transportOptions);
        this.transports.push(transport);
    }

    this._semaphore.start();

    this._runTransports();
};

Benchmark.prototype._runTransports = function() {
    this.transports[this.currentTransport].run();
    this.transports[this.currentTransport].on('ready', function(){
        this.currentTransport++;
        if (this.currentTransport < this.transports.length) {
            this._runTransports();
        } else {
            this._semaphore.reach(this._saveResults.bind(this));
        }
    }.bind(this));
};

Benchmark.prototype._saveResults = function() {
    if (!this.cluster.isMaster) {
        return;
    }

    console.log('Все сделал. Выхожу');
}