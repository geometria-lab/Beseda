PublicationRequest = module.exports = function(session, requestMessage, channel) {
    this.session        = session;
    this.channel        = channel;
	this.requestMessage = requestMessage;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.publicationTimeout);

    this.session.server.log('Session ' + this.session.id + ' publication request to channel ' + this.channel.name + ' started');
}

PublicationRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

	this.channel.publish(this.requestMessage);

    this._sendResponse(true);

    this.session.server.log('Session ' + this.id + ' publication request to channel ' + this.channel.name + ' APPROVED');
}

PublicationRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' publication request to channel ' + this.channel.name + ' already approved';
    }

    this._sendResponse(false, error || 'Publication declined');

    this.session.server.log('Session ' + this.id + ' publication request to channel ' + this.channel.name + ' DECLINED' + (error ? ': ' + error : ''));
}

PublicationRequest.prototype._sendResponse = function(successful, error) {
    return this.send({
        id           : this.requestMessage.id,
        channel      : this.channel.name,
        clientId     : this.id,
        successful   : successful,
        error        : error
    });
}

