ConnectionRequest = module.exports = function(session) {
    this.session = session;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.connectionTimeout);

    this.session.log('Session ' + this.session.id + ' connection request started');
}

ConnectionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this.session.connect();

    this.session.server.log('Session ' + this.session.id + ' connection request APPROVED');
}

ConnectionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' connection request already approved';
    }

    this.session.sendConnectionResponse(false, error || 'Connection declined');

    this.session.server.log('Session ' + this.session.id + ' connection request DECLINED');
}