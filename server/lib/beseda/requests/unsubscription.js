UnsubscriptionRequest = module.exports = function(session, requestMessage, channels) {
    this.session  = session;
    this.channels = channels;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.unsubscriptionTimeout);

    this.session.server.log('Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" started');
}

UnsubscriptionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this.session.unsubscribe(this.channels);

    this._sendResponse(true);

    this.session.server.log('Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" APPROVED');
}

UnsubscriptionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" already approved';
    }

    this._sendResponse(false, error || 'Unsubscription declined');

    this.session.server.log('Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" DECLINED' + (error ? ': ' + error : ''));
}

UnsubscriptionRequest.prototype._sendResponse = function(successful, error) {
    return this.session.send({
        id           : this.requestMessage.id,
        channel      : '/meta/unsubscribe',
        clientId     : this.session.id,
        successful   : successful,
        error        : error,
        subscription : this.requestMessage.subscription
    });
}

UnsubscriptionRequest.prototype._getChannelNames = function() {
	return this.channels.map(function(channel){
		return channel.name;
	}).join(', ');
}