var Semaphore = module.exports = function(keyName, count, subscribeRedis, publishRedis) {
    this.keyName = keyName;
    this.count   = count;
    this._currentCount = count;

    this.subscribeRedis = subscribeRedis;
    this.subscribeRedis.on('message', this._decrement.bind(this));
    this.subscribeRedis.subscribe(this.keyName);

    this.publishRedis = publishRedis;

    this._callback = null;

    this._isReached = false;
};

Semaphore.prototype.reach = function(callback) {
    if (this._isReached) {
        throw new Error('Semaphore already reached!');
    }

    this._isReached = true;

    this._callback = callback;
    this.publishRedis.publish(this.keyName, 1);
};

Semaphore.prototype._decrement = function(channel, message) {
    this._currentCount--;

    if (this._currentCount === 0) {
        this.subscribeRedis.unsubscribe();
        this._callback();
    }
};