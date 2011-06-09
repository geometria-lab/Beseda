var util = require('util');

var BesedaClient = require('./../../client/nodejs'),
    Semaphore    = require('./semaphore.js');

// TODO: Publish 5 times for average

var Step = module.exports = function(transport, index, options) {
    process.EventEmitter.call(this);

    this.index     = index;
    this.transport = transport;
    this.options   = options;

    var benchmark = this.transport.benchmark;

    this._semaphore = new Semaphore(benchmark.name + ':transports:' + this.transport.name + ':steps:semaphore',
                                    benchmark.createRedisClient(),
                                    benchmark.redis);

    this._besedaClients = [];
    this._besedaChannelName = '/' + benchmark.name + '/' + this.transport.name;

    this._receivedMessages = 0;
    this._readyTimeout = null;

    this._results = null;

    this._redisKeyTime  = benchmark.name + ':transports:' + this.transport.name + ':steps:' + this.index + ':time';
    this._redisKeyCount = benchmark.name + ':transports:' + this.transport.name + ':steps:' + this.index + ':count';
};

util.inherits(Step, process.EventEmitter);

Step.prototype.run = function() {
    this._result = null;
    this._semaphore.start(this.transport.benchmark.options.node);

    for (var j = 0; j < this.options.nodeSubscribers; j++) {
        var beseda = new BesedaClient({
            host      : this.transport.options.host,
            port      : this.transport.options.port,
            transport : this.transport.name
        });

        var subscribedClients = 0;
        beseda.subscribe(this._besedaChannelName, function(error) {
            subscribedClients++;

            if (subscribedClients == this.options.nodeSubscribers) {
                console.log('Всех подписал жду: ' + this.transport.benchmark.cluster.pid);
                this._semaphore.reach(this._publish.bind(this));
            }
        }.bind(this));

        beseda.on('message', this._handleMessage.bind(this));
        beseda.on('error', function(error, message) {
            console.log('Beseda error: ' + error);
            //console.dir(message);
            //this.transport.benchmark.cluster.close();
            //process.exit();
        }.bind(this));

        this._besedaClients.push(beseda);
    }
};

Step.prototype.getResults = function() {
    if (this._results === null) {
        throw new Error('Run berfore');
    }

    return this._results;
}

Step.prototype._handleMessage = function(channel, message) {
    this._receivedMessages++;

    var time = Date.now() - parseInt(message);

    var redis = this.transport.benchmark.redis;
    redis.incrby(this._redisKeyTime, time);
    redis.incr(this._redisKeyCount);

    if (this._receivedMessages == this.options.nodeSubscribers) {
        console.log('Получил все сообщения жду остальных: ' + this.transport.benchmark.cluster.pid);

        clearTimeout(this._readyTimeout);
        this._semaphore.reach(this._ready.bind(this));
    }
};

Step.prototype._publish = function() {
    console.log('Всех дождался отправляю сообщение: ' + this.transport.benchmark.cluster.pid);

    this._semaphore.start(this.transport.benchmark.options.node);

    this._readyTimeout = setTimeout(this._semaphore.reach.bind(this._semaphore, this._ready.bind(this)),
                                    this.transport.options.receiveMessageTimeLimit);

    var beseda = new BesedaClient({
        host      : this.transport.options.host,
        port      : this.transport.options.port,
        transport : this.transport.name
    });

    beseda.publish(this._besedaChannelName, Date.now());
};

Step.prototype._ready = function() {
    console.log('Всех дождался закрываю клиентов: ' + this.transport.benchmark.cluster.pid);

    for (var i = this._besedaClients.length - 1; i >= 0; i--) {
        this._besedaClients[i].disconnect();
        this._besedaClients[i].removeAllListeners('message');
        delete this._besedaClients[i];
    }

    var benchmark = this.transport.benchmark;

    this._semaphore.start(benchmark.options.node);

    benchmark.redis.mget([this._redisKeyTime, this._redisKeyCount], function(error, replies) {
        console.log('Получаю результаты и говорю реди: ' + this.transport.benchmark.cluster.pid);
        this._semaphore.reach(function() {
            this._results = {
                published   : 1,
                time        : parseInt(replies[0]),
                received    : parseInt(replies[1]),
                subscribers : this.options.subscribers
            };
            this.emit('ready');
            if (benchmark.isMaster) {
                benchmark.redis.del([this._redisKeyTime, this._redisKeyCount]);
            }
        }.bind(this));
    }.bind(this));
}