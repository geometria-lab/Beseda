PublicationRequest = module.exports = function(session, channel) {
    this.session = session;
    this.channel = channel;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.publicationTimeout);

    this.session.log('Session ' + this.session.id + ' publication request to channel ' + this.channel.name + ' started');
}

PublicationRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

	this.channel.publish(message);

    this.session.sendPublicationResponse(this.channel, true);

    this.session.server.log('Session ' + this.id + ' publication request to channel ' + this.channel.name + ' APPROVED');
}

PublicationRequest.prototype.decline = function(error) {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' publication request to channel ' + this.channel.name + ' already approved';
    }

    this.session.sendPublicationResponse(this.channel, false, error || 'Publication declined');

    this.session.server.log('Session ' + this.id + ' publication request to channel ' + this.channel.name + ' DECLINED');
}