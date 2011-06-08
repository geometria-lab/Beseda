var Semaphore = module.exports = function(benchmark, keyName, number) {
    this.subscribeRedis = benchmark.createRedisClient();
    this.publishRedis = benchmark.createRedisClient();

    this.keyName = keyName;
    this.number  = number;

    this._current = null;
};

Semaphore.prototype.start = function() {
    this._current = this.number;
    this.subscribeRedis.subscribeTo(this.keyName, this._decrement.bind(this));
};

Semaphore.prototype.reach = function(callback, interval) {
    this.publishRedis.publish(this.keyName, 1);

    var interval = setInterval(function() {
        if (this._current == 0) {
            clearInterval(interval);
            callback();
            this.subscribeRedis.unsubscribeFrom(this.keyName);
        }
    }.bind(this), interval || 100);
};

Semaphore.prototype._decrement = function(channel, message) {
    this._current -= parseInt(message);
}