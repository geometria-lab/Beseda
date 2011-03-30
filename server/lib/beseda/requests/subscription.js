SubscriptionRequest = module.exports = function(session, requestMessage, channels) {
    this.session  = session;
    this.channels = channels;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.subscriptionTimeout);

    this.session.log('Session ' + this.session.id + ' subscription request to channel ' + this._getChannelNames() + ' started');
}

SubscriptionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this.session.subscribe(this.channels);

    this._sendResponse(true);

    this.session.server.log('Session ' + this.id + ' subscription request to channel ' + this._getChannelNames() + ' APPROVED');
}

SubscriptionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' subscription request to channel ' + this._getChannelNames() + ' already approved';
    }

    this._sendResponse(false, error || 'Subscription declined');

    this.session.server.log('Session ' + this.id + ' subscription request to channel ' + this._getChannelNames() + ' DECLINED' + (error ? ': ' + error : ''));
}

SubscriptionRequest.prototype._sendResponse = function(successful, error) {
    return this.send([{
        id           : this.requestMessage.id,
        channel      : '/meta/subscribe',
        clientId     : this.id,
        successful   : successful,
        error        : error,
        subscription : this.requestMessage.subscription
    }]);
}

SubscriptionRequest.prototype._getChannelNames = function() {
	return this.channels.map(function(channel){
		return channel.name;
	}).join(', ');
}