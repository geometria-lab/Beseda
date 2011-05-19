var util = require('util');

ConnectionRequest = module.exports = function(session, requestMessage) {
    this.session        = session;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this.session.server.log('Session ' + this.session.id + ' connection request started');
};

ConnectionRequest.prototype.approve = function() {
    this.isApproved = true;

    this._sendResponse(true);

    this.session.server.log('Session ' + this.session.id + ' connection request APPROVED');
};

ConnectionRequest.prototype.decline = function(error) {
    if (this.isApproved) {
        throw new Error('Session ' + this.requestMessage.clientId + ' connection request already approved');
    }

    this._sendResponse(false, error || 'Connection declined');

    this.session.server.log('Session ' + this.session.id + ' connection request DECLINED' + (error ? ': ' + error : ''));

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
