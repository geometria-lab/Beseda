var Channel = require('./../channel.js');

SubscriptionRequest = module.exports = function(session, requestMessage, channels) {
    this.session  = session;
    this.channels = channels;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this.session.server.log('Session ' + this.session.id + ' subscription request to channel "' + this._getChannelNames() + '" started');
};

SubscriptionRequest.prototype.approve = function() {
    this.isApproved = true;

    for (var i = 0; i < this.channels.length; i++) {
        this.session.subscribe(this.channels[i]);
    }

    this._sendResponse(true);

    this.session.server.log('Session ' + this.session.id + ' subscription request to channel "' + this._getChannelNames() + '" APPROVED');
};

SubscriptionRequest.prototype.decline = function(error) {
    if (this.isApproved) {
        throw new Error('Session ' + this.session.id + ' subscription request to channel "' + this._getChannelNames() + '" already approved');
    }

    for (var i = 0; i < this.channels.length; i++) {
        if (!this.channels[i].hasSubscriptions()) {
            Channel.remove(this.channels[i].name);
        }
    }

    this._sendResponse(false, error || 'Subscription declined');

    this.session.server.log('Session ' + this.session.id + ' subscription request to channel "' + this._getChannelNames() + '" DECLINED' + (error ? ': ' + error : ''));
};

SubscriptionRequest.prototype._sendResponse = function(successful, error) {
    return this.session.send({
        id           : this.requestMessage.id,
        channel      : '/meta/subscribe',
        clientId     : this.requestMessage.clientId,
        successful   : successful,
        error        : error,
        subscription : this.requestMessage.subscription
    });
};

SubscriptionRequest.prototype._getChannelNames = function() {
    return this.channels.map(function(channel){
        return channel.name;
    }).join(', ');
};