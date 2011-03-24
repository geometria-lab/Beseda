var fs          = require('fs'),
    path        = require('path'),
    sys         = require('sys'),
    http        = require('http'),
    https       = require('https'),
    nodeStatic  = require('node-static'),
    io          = require('socket.io');

var Options     = require('./options'),
    Session     = require('./session'),
    Channel     = require('./channel')

Server = module.exports = function(options) {
    process.EventEmitter.call(this);

    var self = this;

    this.options({
        host : null,
        port : 8080,
        ssl  : false,

        server : null,

        socketIO : {},

        pubSub : {
            type : 'redis',
            host : '127.0.0.1',
            port : 6379
        },

        log : function(message) {
            sys.log(message)
        },

        connectionTimeout   : 10000,
        subscriptionTimeout : 100,
        publicationTimeout  : 100
	}, options);

    // Setup server
    if (!this.options.server) {
        // Create own http server from options
        if (this.options.ssl != false) {
            // Create https server with credentials
            var credentials = {}
            if (path.existsSync(this.options.ssl.key)) {
                credentials.key = fs.readFileSync(this.options.ssl.key, 'utf8');
            } else {
                credentials.key = this.options.ssl.key;
            }

            if (path.existsSync(this.options.ssl.cert)) {
                credentials.cert = fs.readFileSync(this.options.ssl.cert, 'utf8');
            } else {
                credentials.cert = this.options.ssl.cert;
            }

            this.httpServer = https.createServer(credentials);
        } else {
            // Create basic http server
            this.httpServer = http.createServer();
        }
    } else {
        // Use http from options
        this.httpServer = this.options.server;
    }

    // Add request listener with node-static before other
    var listeners = this.server.listeners('request');
	this.httpServer.removeAllListeners('request');

    var fileServer = new nodeStatic.Server(__dirname + "/../../public");

    this.httpServer.addListener('request', function(request, response) {
        fileServer.serve(request, response, function (err, result) {
            if (error) {
                for (listener in listeners) {
                    listener.call(this, request, response);
                }
            } else {
                this.log("Static file request: " + request.url + " - " + response.message);
            }
        }.bind(this));
	});

    function clone(object) {
        var newObject = {};
        for (p in object) {
            newObject[p] = p;
        }
        return newObject;
    }

    // Setup socket.io
    if (this.options.socketIO.constructor == Object) {
        // Create socketIO from options
        var socketOptions = clone(this.options.socketIO);

        // Set our log to socketIo
        if (socketOptions.log == undefined) {
            socketOptions.log = this.options.log;
        }

        this.socketIO = io.listen(this.httpServer, socketOptions);
    } else {
        // Use socket.io from options
        this.socketIO = this.options.socketIO;
    }

    // Add connection listener
    this.socketIO.on('connection', function(client) {
        client.on('message', function(message) {
            this._onMessage(client, message);
        }.bind(this));

        client.on('disconnect', function(){
            this._onDisconnect(client);
        }.bind(this));
    }.bind(this));

    // Setup PubSub
    if (typeof this.options.pubSub == 'string') {
        this.pubSub = new require('./pubsub/' + this.options.pubSub);
    } else if (this.options.pubSub.constructor == Object) {
        var pubSubOptions = clone(this.options.pubSub);
        var type = pubSubOptions.type;
        delete pubSubOptions.type;

        var PubSub = require('./pubsub/' + type);
        this.pubSub = new PubSub(pubSubOptions);
    } else {
        // Use PubSub from options
        this.pubSub = this.options.pubSub;
    }
}

sys.inherits(Server, process.EventEmitter);
sys.inherits(Server, Options);

Server.prototype.log = function(message) {
    return this.options.log(message);
}

Server.prototype.listen = function(port, host) {
    if (this.options.server) {
        throw 'You must call you server listen method';
    }

    host = host || this.options.host;
    port = port || this.options.port;

    this.log('Start listening: ' + host + ':' + port);

    this.httpServer.listen(port, host);
}

Server.prototype._onMessage = function(client, message) {
    function sendError() {
        client.send({
            channel : '/meta/error',
            data    : 'Channel or agentId not present'
        });
    }

    if ((message.channel || message.channels) && message.sessionId) {
        var channels = message.channels ? message.channels : [ message.channel ];

        if (channels.length > 0) {
            for (channel in channels) {
                switch (channel) {
                    case '/meta/connect':
                      this._connect(client, message);
                      break;
                    case '/meta/subscribe':
                      this._subscribe(client, message);
                      break;
                    default:
                      this._publish(client, message);
                  }
            }
        } else {
            return sendError();
        }
    } else {
        return sendError();
    }
}

Server.prototype._onDisconnect = function(client) {
    var session = Session.get(client.session_id);

    if (session) {
        Session.remove(session.id);
    } else {
        throw 'Session ' + client.session_id + ' not found';
    }

    this.emit('disconnect', session);
}

Server.prototype._connect = function(client, message) {
    var session = new Session(client);

    var listeners = this.listeners('connect');
    if (listeners.length > 0) {
        session.requireApprovement(this.options.connectionTimeout);
        this.emit('connect', session, message); // must call session.approve();
    }

    this.log('Session ' + session.id + ' started');
}

Server.prototype._subscribe = function(client, message) {
    if (message.data && (message.data.channels || message.data.channel)) {
        var session = Session.get(client.session_id);
        if (session) {
            var channels = message.data.channels ? message.data.channels : [ message.data.channel ];
            for (channelName in channels) {
                var channel = Channel.get(channelName);

                if (!channel) {
                    channel = new Channel(channelName);
                }

                if (channel.isSubscribed(session)) {
                    return client.send({
                        channel    : '/meta/subscribe',
                        successful : false,
                        error      : 'You already subscribed to ' + channelName
                    });
                }

                channel.subscribe(session);
            }
        } else {
            return client.send({
                channel    : '/meta/subscribe',
                successful : false,
                error      : 'You must send connection message before'
            });
        }




        var name = message.data.channel,
        self = this;

    this.__withAgent(client, message.agentId, function (err, agent) {
      if (err) {
        message.successful = false;
        message.error = "unknown agentId";
        agent.send(message);
        return;
      }

      var channel = self.channel(name);
      agent.client = client;

      agent.requireSubscription(self.TIMEOUTS.onSubscriptionRequest, message, channel);

      if (channel.onSubscriptionRequest) {
        channel.onSubscriptionRequest(channel, agent);
      } else {
        self.onSubscriptionRequest(channel, agent);
      }
    });


    } else {
        return client.send({
            channel    : '/meta/subscribe',
            successful : false,
            error      : 'You must have a data.channel in your subscribe message'
        });
    }
}

Server.prototype._publish = function(client, message) {

}