var redis = require('./../vendor/redis');

var Transport = require('./transport.js'),
    Semaphore = require('./semaphore.js');

var Benchmark = module.exports = function(name, options) {
    this.name = name;
    this.options = options;

    if (this.options.node < 1) {
        this.options.node = 1;
    }

    var workers = this.options.node - 1;
    if (workers < 1) {
        workers = 1;
    }
    this.cluster = require('cluster')().set('workers', workers);

    this.redis = this.createRedisClient();

    this.transports = [];
    this.currentTransport = 0;

    this._semaphore = new Semaphore(this.name + ':semaphore',
                                    this.options.node,
                                    this.createRedisClient(),
                                    this.redis);

    this._readyCallback = null;
    this._results = null;
};

Benchmark.prototype.createRedisClient = function() {
    return redis.createClient(this.options.redis.port, this.options.redis.host);
}

Benchmark.prototype.run = function(readyCallback) {
    this._readyCallback = readyCallback;
    this._results = null;
    this.cluster.start();

    for (var name in this.options.transports) {
        var transportOptions = this.options.transports[name];

        for (var i = 0; i < transportOptions.steps.length; i++) {
            var step = transportOptions.steps[i];

            step.nodeSubscribers = this._devideByNode(step.subscribers);
            step.nodePublish     = this._devideByNode(step.publish);
            step.nodePublishTime = this._devideByNode(step.publishTime);
        }

        var transport = new Transport(this, name, transportOptions);
        this.transports.push(transport);
    }

    this._runTransports();
};

Benchmark.prototype.getResult = function() {
    if (this._results === null) {
        throw new Error('Must run before, save results in run callback');
    }
    return this._results;
}

Benchmark.prototype.saveResults = function() {
    if (this._results === null) {
        throw new Error('Must run before, save results in run callback');
    }
    console.log('Сохраняю результаты');
    console.dir(this._results);
}

Benchmark.prototype._devideByNode = function(count) {
    if (this.cluster.isMaster) {
        return count - Math.floor(count / this.options.node) * (this.options.node - 1);
    } else {
        return Math.floor(count / this.options.node);
    }
}

Benchmark.prototype._runTransports = function() {
    this.transports[this.currentTransport].run();
    this.transports[this.currentTransport].on('ready', function(){
        this.currentTransport++;
        if (this.currentTransport < this.transports.length) {
            this._runTransports();
        } else {
            this._semaphore.reach(this._ready.bind(this));
        }
    }.bind(this));
};

Benchmark.prototype._ready = function() {
    if (!this.cluster.isMaster) {
        return;
    }

    console.log('Получаю результаты');

    this._results = {};
    for (var i = 0; i < this.transports.length; i++) {
        this._results[this.transports[i].name] = this.transports[i].getResults();
    }

    this.cluster.close();

    this._readyCallback(this);
}