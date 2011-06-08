var Semaphore = module.exports = function(keyName, subscribeRedis, publishRedis) {
    this.subscribeRedis = subscribeRedis;
    this.publishRedis = publishRedis;

    this.keyName = keyName;

    this._count = null;
    this._callback = null;

    this._isReached = false;
};

Semaphore.prototype.start = function(count) {
    this._count = count;
    this._isReached = false;
    this.subscribeRedis.subscribeTo(this.keyName, this._decrement.bind(this));
};

Semaphore.prototype.reach = function(callback) {
    if (this._isReached) {
        throw new Error('Semaphore already reached!');
    }

    this._callback = callback;
    this.publishRedis.publish(this.keyName, 1);

    this._isReached = true;
};

Semaphore.prototype._decrement = function(channel, message) {
    this._count--;

    if (this._count === 0) {
        this.subscribeRedis.unsubscribeFrom(this.keyName);
        this._callback();
    }
};