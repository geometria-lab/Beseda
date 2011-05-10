var util = require('util');

ConnectionRequest = module.exports = function(session, requestMessage) {
    this.session        = session;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    //this._timeout = setTimeout(this.decline.bind(this),
     //                          this.session.server.options.connectionTimeout);

    util.log('Session ' + this.session.clientID + ' connection request started');
};

ConnectionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this._sendResponse(true);

    util.log('Session ' + this.session.clientID + ' connection request APPROVED');

    //this.session.server.monitor.increment('connection');
};

ConnectionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw new Error('Session ' + this.session.clientID + ' connection request already approved');
    }

    this._sendResponse(false, error || 'Connection declined');

    util.log('Session ' + this.session.clientID + ' connection request DECLINED' + (error ? ': ' + error : ''));

    //this.session.server.monitor.increment('declinedConnection');

    this.session.destroy();
};

ConnectionRequest.prototype._sendResponse = function(successful, error) {
    return this.session.send({
        id         : this.requestMessage.id,
        channel    : '/meta/connect',
        clientId   : this.session.clientID,
        successful : successful,
        error      : error
    });
};
