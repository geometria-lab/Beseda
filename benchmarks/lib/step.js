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

    this._subscribeSemaphore = new Semaphore(benchmark.name + ':transports:' + this.transport.name + ':steps:semaphore:subscribe',
                                             benchmark.options.node,
                                             benchmark.createRedisClient(),
                                             benchmark.redis);

    this._receivedSemaphore = new Semaphore(benchmark.name + ':transports:' + this.transport.name + ':steps:semaphore:received',
                                            benchmark.options.node,
                                            benchmark.createRedisClient(),
                                            benchmark.redis);

    this._resultsSemaphore = new Semaphore(benchmark.name + ':transports:' + this.transport.name + ':steps:semaphore:results',
                                           benchmark.options.node,
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
                this._subscribeSemaphore.reach(this._publish.bind(this));
            }
        }.bind(this));

        beseda.on('message', this._handleMessage.bind(this));
        beseda.on('error', function(error, message) {
            console.log('Beseda client error: ' + error);
        }.bind(this));

        this._besedaClients.push(beseda);
    }
};

Step.prototype.getResults = function() {
    if (this._results === null) {
        throw new Error('Run berfore');
    }

    return this._results;
};

Step.prototype._handleMessage = function(channel, message) {
    this._receivedMessages++;

    var time = Date.now() - parseInt(message);

    var redis = this.transport.benchmark.redis;
    redis.incrby(this._redisKeyTime, time);
    redis.incr(this._redisKeyCount);

    if (this._receivedMessages == this.options.nodeSubscribers) {
        console.log('Получил все сообщения жду остальных: ' + this.transport.benchmark.cluster.pid);

        clearTimeout(this._readyTimeout);
        this._receivedSemaphore.reach(this._ready.bind(this));
    }
};

Step.prototype._publish = function() {
    console.log('Всех дождался отправляю сообщение: ' + this.transport.benchmark.cluster.pid);

    this._readyTimeout = setTimeout(this._receivedSemaphore.reach.bind(this._receivedSemaphore, this._ready.bind(this)),
                                    this.transport.options.receiveMessageTimeLimit);

    var beseda = new BesedaClient({
        host      : this.transport.options.host,
        port      : this.transport.options.port,
        transport : this.transport.name
    });

    for (var i = 0; i < this.options.nodePublish; i++) {
        setTimeout(function(){
            beseda.publish(this._besedaChannelName, Date.now());
        }.bind(this), Math.round(Math.random() * this.options.nodePublishTime));
    }
};

Step.prototype._ready = function() {
    console.log('Всех дождался закрываю клиентов: ' + this.transport.benchmark.cluster.pid);

    for (var i = this._besedaClients.length - 1; i >= 0; i--) {
        this._besedaClients[i].disconnect();
        this._besedaClients[i].removeAllListeners('message');
        delete this._besedaClients[i];
    }

    var benchmark = this.transport.benchmark;

    benchmark.redis.mget([this._redisKeyTime, this._redisKeyCount], function(error, replies) {
        console.log('Получаю результаты и говорю реди: ' + this.transport.benchmark.cluster.pid);
        this._resultsSemaphore.reach(function() {
            var fullTime = replies[0] ? parseInt(replies[0]) : this.transport.options.receiveMessageTimeLimit;
            var received = replies[1] ? parseInt(replies[1]) : 0;

            this._results = {
                subscribers : this.options.subscribers,
                published   : this.options.publish,
                received    : received,
                lost        : (this.options.subscribers * this.options.publish) - received,
                fullTime    : fullTime,
                averageTime : received ? fullTime / received : fullTime
            };

            this.emit('ready');

            if (benchmark.cluster.isMaster) {
                benchmark.redis.del([this._redisKeyTime, this._redisKeyCount]);
            }
        }.bind(this));
    }.bind(this));
};