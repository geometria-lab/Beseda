var Channel = require('./channel');

var sessions = {};

Session = module.exports = function(server, client) {
    this.server      = server;
    this.id          = client.session_id;
    this.client      = client;

    this.isConnected = false;

    this._subscriptionRequests = {};

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

Session.prototype.connect = function() {
    this.isConnected = true;

    this.session.sendConnectionResponse(true);

    this.log('Session ' + this.id + ' connected!');
}

Session.prototype.connectionRequest = function() {
    if (this._connectionRequest == undefined) {
        this._connectionRequest = new ConnectionRequest(this);
    }

    return this._connectionRequest;
}

Session.prototype.sendConnectionResponse = function(successful, error) {
    this.send({
        channel    : '/meta/connect',
        successful : successful,
        error      : error || ''
    });
}

Session.prototype.subscribe = function(channel) {
    channel.subscribe(this);

    this.sendSubscriptionResponse(this, true);
}

Session.prototype.subscriptionRequest = function(channel) {
    if (!this._subscriptionRequests[channel.name]) {
        this._subscriptionRequests[channel.name] = new SubscriptionRequest(this, channel);
    }

    return this._subscriptionRequests[channel.name];
}

Session.prototype.sendSubscriptionResponse = function(channel, successful, error) {
    this.send({
        channel      : '/meta/subscribe',
        successful   : successful,
        error        : error || '',
        subscription : channel.name
    })
}

Session.prototype.send = function(message) {
    this.client.send(message);
}

Session.prototype.destroy = function() {
    Session.remove(session.id);

    for (channel in Channel.getAll()) {
        if (channel.isSubscribed(this)) {
            channel.unsubscribe(this);
        }
    }
}










Session.prototype.subscribe = function(channel) {
    this.server.log('Session ' + session.id + ' subscribed to channel ' + channel.name);
}







ConnectionRequest = function(session) {
    this.session    = session;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.connectionTimeout);

    this.session.log('Session ' + this.session.id + ' connection request started');
}
ConnectionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this.session.connect();

    this.session.server.log('Session ' + this.session.id + ' connection request APPROVED');
}
ConnectionRequest.prototype.decline = function() {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' connection request already approved';
    }

    this.session.sendConnectionResponse(false, 'Connection declined');

    this.session.server.log('Session ' + this.session.id + ' connection request DECLINED');
}


SubscriptionRequest = function(session, channel) {
    this.session = session;
    this.channel = channel;

    this.isApproved = false;

    this._timeout = setTimeout(this.decline.bind(this),
                               this.session.server.options.subscriptionTimeout);

    this.session.log('Session ' + this.session.id + ' subscription request to channel ' + this.channel.name + ' started');
}
SubscriptionRequest.prototype.approve = function() {
    clearTimeout(this._timeout);

    this.isApproved = true;

    this.session.subscribe(this.channel);

    this.session.server.log('Session ' + this.id + ' subscription request to channel ' + this.channel.name + ' APPROVED');
}
SubscriptionRequest.prototype.decline = function() {
    clearTimeout(this._timeout);

    if (this.isApproved) {
        throw 'Session ' + this.session.id + ' subscription request to channel ' + this.channel.name + ' already approved';
    }

    this.session.sendSubscriptionResponse(this.channel, false, 'Subscription declined');

    this.session.server.log('Session ' + this.id + ' subscription request to channel ' + this.channel.name + ' DECLINED');
}












agent.prototype.subscribe = function(channel){
  this.subscriptionResponse(channel, true);
  channel.subscribe(this);
};

agent.prototype.subscriptionDenied = function(channel, reason){
  this.subscriptionResponse(channel, false, reason);
};

agent.prototype.subscriptionResponse = function(channel, successful, error){
  error || (error = "");

  if(typeof(channel) == "string"){
    name = channel;
  }else{
    name = channel.name;
  }

  var request = this.subscriptionRequests[name];
  var message = request.message;
  clearTimeout(request.timeout);

  message.successful = successful;
  message.error = error;
  this.send(message);
};

agent.prototype.requirePublication = function(timeout, message, channel){
  var self = this;

  var name = message.uuid;
  this.publicationRequests || (this.publicationRequests = {});

  var request = {};
  request.message = message;

  request.timeout = setTimeout(function(){
    self.publicationDenied(message, "Time expired before publication authorization could be established.");
  }, timeout);

  this.publicationRequests[name] = request;
};


agent.prototype.publicationSuccess = function(message){
  this.publicationResponse(message, true);
};

agent.prototype.publicationDenied = function(message, reason){
  this.publicationResponse(message, false, reason);
};

agent.prototype.publicationResponse = function(message, successful, error){
  error || (error = "");

  var request = this.publicationRequests[message.uuid];
  var newMessage={};

  clearTimeout(request.timeout);
  delete this.publicationRequests[message.uuid];

  if(successful){
    newMessage.channel="/meta/successful";
  }else{
    newMessage.channel="/meta/error";
    newMessage.error = error;
  }
  newMessage.uuid = message.uuid;

  this.send(newMessage);
};

agent.prototype.requireSubscription = function(timeout, message, channel){
  var self = this;

  var name = channel.name;
  this.subscriptionRequests || (this.subscriptionRequests = {});

  var request = {};
  request.message = message;

  request.timeout = setTimeout(function(){
    self.subscriptionDenied(channel, "Time expired before subscription authorization could be established.");
  }, timeout);

  this.subscriptionRequests[name] = request;
};

module.exports = Agent;
