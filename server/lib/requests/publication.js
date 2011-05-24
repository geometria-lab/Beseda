var util = require('util');

var PublicationRequest = module.exports = function(session, requestMessage, channel) {
    this.session        = session;
    this.channel        = channel;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this.session.server.log('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" started');
};

PublicationRequest.prototype.approve = function() {
    this.isApproved = true;

    this.channel.publish(this.requestMessage);

    this._sendResponse(true);

    this.session.server.log('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" APPROVED');
};

PublicationRequest.prototype.decline = function(error) {
    if (this.isApproved) {
        throw new Error('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" already approved');
    }

    this._sendResponse(false, error || 'Publication declined');

    this.session.server.log('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" DECLINED' + (error ? ': ' + error : ''));
};

PublicationRequest.prototype._sendResponse = function(successful, error) {
    return this.session.send({
        id           : this.requestMessage.id,
        channel      : this.channel.name,
        clientId     : this.requestMessage.clientId,
        successful   : successful,
        error        : error
    });
};

