var util = require('util');

var PublicationRequest = module.exports = function(session, requestMessage, channel) {
    this.session        = session;
    this.channel        = channel;
    this.requestMessage = requestMessage;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.publicationTimeout * 1000);

    util.log('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" started');
};

PublicationRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this.channel.publish(this.requestMessage);

    this._sendResponse(true);

    util.log('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" APPROVED');

   // this.session.server.monitor.increment('publication');
};

PublicationRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw new Error('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" already approved');
    }

    this._sendResponse(false, error || 'Publication declined');

    util.log('Session ' + this.session.id + ' publication request to channel "' + this.channel.name + '" DECLINED' + (error ? ': ' + error : ''));

    //this.session.server.monitor.increment('declinedPublication');
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

