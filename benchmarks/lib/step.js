var util = require('util');

var BesedaClient = require('./../../client/nodejs'),
    Semaphore    = require('./semaphore.js');

// TODO: Publish 5 times for average

var Step = module.exports = function(transport, index, options) {
    process.EventEmitter.call(this);

    this.index     = index;
    this.transport = transport;
    this.options   = options;

    this._semaphore = new Semaphore(this.transport.benchmark,
                                    this.transport.benchmark.name + ':transports:' + this.transport.name + ':steps:semaphore',
                                    this.transport.benchmark.options.node);

    this._besedaClients = [];
    this._besedaChannelName = '/' + this.transport.benchmark.name + '/' + this.transport.name;

    this._receivedMessages = 0;
    this._readyTimeout = null;
};

util.inherits(Step, process.EventEmitter);

Step.prototype.run = function() {
    this._semaphore.start();

    for (var j = 0; j < this.options.subscribe; j++) {
        var beseda = new BesedaClient({
            host      : this.transport.options.host,
            port      : this.transport.options.port,
            transport : this.transport.name
        });

        var subscribedClients = 0;
        beseda.subscribe(this._besedaChannelName, function(error) {
            subscribedClients++;

            if (subscribedClients == this.options.subscribe) {
                console.log('Всех подписал жду: ' + this.transport.benchmark.cluster.pid);
                this._semaphore.reach(this._publish.bind(this));
            }
        }.bind(this));

        beseda.on('message', this._handleMessage.bind(this));
        beseda.on('error', function(error, message) {
            console.log(error);
            console.log(util.inspect(message));
            this.transport.benchmark.clusterProcess.close();
            process.exit();
        }.bind(this));

        this._besedaClients.push(beseda);
    }
};

Step.prototype._handleMessage = function(channel, message) {
    this._receivedMessages++;

    var time = Date.now() - parseInt(message);

    var benchmark = this.transport.benchmark;
    benchmark.redis.incrby(benchmark.name + ':transports:' + this.transport.name + ':steps:' + this.index + ':time', time);
    benchmark.redis.incr(benchmark.name + ':transports:' + this.transport.name + ':steps:' + this.index + ':count');

    if (this._receivedMessages == this.options.subscribe) {
        console.log('Получил все сообщения жду остальных: ' + this.transport.benchmark.cluster.pid);

        clearTimeout(this._readyTimeout);
        this._semaphore.reach(this._ready.bind(this));
    }
};

Step.prototype._publish = function() {
    console.log('Всех дождался отправляю сообщение: ' + this.transport.benchmark.cluster.pid);

    this._semaphore.start();

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
    console.log('Всех дождался закрываю клиентов и говорю рэди: ' + this.transport.benchmark.cluster.pid);

    for (var i = this._besedaClients.length - 1; i >= 0; i--) {
        this._besedaClients[i].disconnect();
        this._besedaClients[i].removeAllListeners('message');
        delete this._besedaClients[i];
    }

    this.emit('ready');
}