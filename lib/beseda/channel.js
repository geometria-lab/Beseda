var Session = require('./session');

var channels = {};

// Cleanup channels every 10 minutes
setInterval(function() {
    var deletedChannels = [];
    for (channel in channels) {
        if (channel.subscriptions.length == 0) {
            deletedChannels.push(channel.name);
            delete channels[channel.name];
        }
    }

    //TODO: Need logger
    sys.log('Channel cleanup: ' + deletedChannels.join(', '));
}, 1000 * 10); //1000 * 60 * 10

Channel = module.exports = function(name) {
    this.name = name
    this.subscriptions = {};

    if (channels[name]) {
        throw 'Channel ' + name + 'already exists';
    } else {
        channels[name] = name;
    }
}

Channel.get = function(name) {
    return channels[name]
}

Channel.prototype.publish = function(message) {
    for (sessionId in this.subscriptions) {
        // TODO: Remove this check and require from top
        if (!Session.get(sessionId)) {
            throw 'Session ' + sessionId + ' not present in sessions';
        }

        this.subscriptions[sessionId].send(message);
    }
}

Channel.prototype.subscribe = function(session) {
    if (this.isSubscribed[session]) {
        throw 'Session ' + session.id + ' already subscribed to channel ' + this.name;
    }

    this.subscriptions[session.id] = session;
}

Channel.prototype.isSubscribed = function(session){
    return !!this.subscriptions[session.id]
}

Channel.prototype.unsubscribe = function(session) {
    if (!this.isSubscribed[session]) {
        throw 'Session ' + session.id + ' not subscribed to channel ' + this.name;
    }

    delete this.subscriptions[session.id];
}


/*
var sys = require("sys");

var Events = require("./events");

var SuperClass = require("superclass");
Channel = module.exports = new SuperClass;

Channel.extend({
  channels: {},
  
  find: function(name){
    if ( !this.channels[name] ) 
      this.channels[name] = new Channel(name)
    return this.channels[name];
  },
  
  publish: function(message){
    var channels = message.getChannels();
    delete message.channels;
    
    sys.log(
      "Publishing to channels: " + 
      channels.join(", ") + " : " + message.data
    );
    
    for(var i=0, len = channels.length; i < len; i++) {
      message.channel = channels[i];
      var clients     = this.find(channels[i]).clients;
      
      for(var x=0, len2 = clients.length; x < len2; x++) {
        clients[x].write(message);
      }
    }
  },
  
  unsubscribe: function(client){
    for (var name in this.channels)
      this.channels[name].unsubscribe(client);
  }
});

Channel.include({
  init: function(name){
    this.name    = name;
    this.clients = [];
  },
  
  subscribe: function(client){
    this.clients.push(client);
    Events.subscribe(this, client);
  },
  
  unsubscribe: function(client){
    if ( !this.clients.include(client) ) return;
    this.clients = this.clients.delete(client);
    Events.unsubscribe(this, client);
  }
});

*/