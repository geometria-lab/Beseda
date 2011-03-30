ConnectionRequest = module.exports = function(session, requestMessage) {
    this.session        = session;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.connectionTimeout);

    this.session.server.log('Session ' + this.session.id + ' connection request started');
}

ConnectionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this._sendResponse(true);

    this.session.server.log('Session ' + this.session.id + ' connection request APPROVED');
}

ConnectionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' connection request already approved';
    }

    this._sendResponse(false, error || 'Connection declined');

	this.session.destroy();

    this.session.server.log('Session ' + this.session.id + ' connection request DECLINED' + (error ? ': ' + error : ''));
}

ConnectionRequest.prototype._sendResponse = function(successful, error) {
    return this.session.send({
        id         : this.requestMessage.id,
        channel    : '/meta/connect',
        clientId   : this.session.id,
        successful : successful,
        error      : error
    });
}