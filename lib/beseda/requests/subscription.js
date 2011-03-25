SubscriptionRequest = module.exports = function(session, channels) {
    this.session  = session;
    this.channels = channels;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.subscriptionTimeout);

    this.session.log('Session ' + this.session.id + ' subscription request to channel ' + this._getChannelNames() + ' started');
}

SubscriptionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this.session.subscribe(this.channels);

    this.session.server.log('Session ' + this.id + ' subscription request to channel ' + this._getChannelNames() + ' APPROVED');
}

SubscriptionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' subscription request to channel ' + this._getChannelNames() + ' already approved';
    }

    this.session.sendSubscriptionResponse(this.channels, false, error || 'Subscription declined');

    this.session.server.log('Session ' + this.id + ' subscription request to channel ' + this._getChannelNames() + ' DECLINED');
}

SubscriptionRequest.prototype._getChannelNames = function() {
	return this.channels.map(function(channel){
		return channel.name;
	}).join(', ');
}