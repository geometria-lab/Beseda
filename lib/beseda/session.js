var sessions = {};

Session = module.exports = function(client) {
    this.id          = client.session_id
    this.client      = client
    this.isAccepted  = true;
    this._approvementTimeout = null;

    if (sessions[this.id]) {
        throw 'Session ' + this.id + ' already exists.';
    } else {
        sessions[this.id] = this;
    }
}

Session.get = function(id) {
    return sessions[id];
}

Session.getAll = function() {
    return sessions;
}

Session.remove = function(id) {
    delete sessions[id];
}

Session.prototype.send = function(message) {
    this.client.send(message);
}

Session.prototype.approve = function() {
    this.isAccepted = true;
    clearTimeout(this._approvementTimeout);
}

Session.prototype.requireApprovement = function(timeout) {
    this.isAccepted = false;
    this._approvementTimeout = setTimeout(function() {
        this.send({
            channel    : '/meta/connect',
            successful : false,
            error      : 'Session not approved'
        });
    }.bind(this), timeout);
}