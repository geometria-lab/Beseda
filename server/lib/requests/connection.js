var util = require('util');

ConnectionRequest = module.exports = function(session, requestMessage) {
    this.session        = session;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this), 1000);
                              // this.session.server.options.connectionTimeout);

    util.log('Session ' + this.session.connectionID + ' connection request started');
};

ConnectionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this._sendResponse(true);

    util.log('Session ' + this.session.connectionID + ' connection request APPROVED');
};

ConnectionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw new Error('Session ' + this.requestMessage.clientId + ' connection request already approved');
    }

    this._sendResponse(false, error || 'Connection declined');

    util.log('Session ' + this.session.connectionID + ' connection request DECLINED' + (error ? ': ' + error : ''));

    this.session.destroy();
};

ConnectionRequest.prototype._sendResponse = function(successful, error) {
    return this.session.send({
        id         : this.requestMessage.id,
        channel    : '/meta/connect',
        clientId   : this.requestMessage.clientId,
        successful : successful,
        error      : error
    });
};
