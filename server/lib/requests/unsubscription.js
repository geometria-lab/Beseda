var util = require('util');

UnsubscriptionRequest = module.exports = function(session, requestMessage, channels) {
    this.session  = session;
    this.channels = channels;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.unsubscriptionTimeout * 1000);

    util.log('Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" started');
};

UnsubscriptionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    for (var i = 0; i < this.channels.length; i++) {
        this.channels[i].unsubscribe(this.session);
    }

    this._sendResponse(true);

    util.log('Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" APPROVED');
};

UnsubscriptionRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw new Error('Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" already approved');
    }

    this._sendResponse(false, error || 'Unsubscription declined');

    util.log('Session ' + this.session.id + ' unsubscription request to channel "' + this._getChannelNames() + '" DECLINED' + (error ? ': ' + error : ''));
};

UnsubscriptionRequest.prototype._sendResponse = function(successful, error) {
    return this.session.send({
        id           : this.requestMessage.id,
        channel      : '/meta/unsubscribe',
        clientId     : this.requestMessage.clientId,
        successful   : successful,
        error        : error,
        subscription : this.requestMessage.subscription
    });
};

UnsubscriptionRequest.prototype._getChannelNames = function() {
    return this.channels.map(function(channel){
        return channel.name;
    }).join(', ');
};
