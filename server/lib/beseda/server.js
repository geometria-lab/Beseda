var fs          = require('fs'),
    path        = require('path'),
    sys         = require('sys'),
    http        = require('http'),
    https       = require('https'),
    static      = require('node-static'),
    io          = require('./../../vendor/socket.io');

var Router = require('./router.js');

require('./utils.js');

Server = module.exports = function(options) {
    process.EventEmitter.call(this);

    this.setOptions({
        host : '127.0.0.1',
        port : 80,
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

        connectionTimeout     : 10000,
        subscriptionTimeout   : 100,
        publicationTimeout    : 100,
        unsubscriptionTimeout : 100
    }, options);

    /**
     *  Setup server
     **/
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
        // Use server from options
        this.httpServer = this.options.server;
    }

    // Add request listener with node-static before other
    var listeners = this.httpServer.listeners('request');
    this.httpServer.removeAllListeners('request');

    var fileServer = new static.Server('./client/js');

    this.httpServer.addListener('request', function(request, response) {
        request.addListener('end', function () {
            fileServer.serve(request, response, function (error, result) {
                if (error) {
                    for (var listener in listeners) {
                        listener.call(this, request, response);
                    }
                } else {
                    this.log('Static file served: ' + request.url);
                }
            }.bind(this));
        }.bind(this));
    }.bind(this));

    /**
     *  Setup Socket.IO
     **/
    if (this.options.socketIO.constructor == Object) {
        // Create socketIO from options
        var socketOptions = Object.clone(this.options.socketIO);

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

        client.on('disconnect', function() {
            this._onDisconnect(client);
        }.bind(this))
    }.bind(this));

    /**
     *  Setup Router
     **/
    this.router = new Router(this);

    /**
     *  Setup PubSub
     **/
    if (this.options.pubSub instanceof String) {
        this.pubSub = new require('./pubsub/' + this.options.pubSub);
    } else if (this.options.pubSub.constructor == Object) {
        var pubSubOptions = Object.clone(this.options.pubSub);
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

Server.prototype.listen = function(port, host) {
    if (this.options.server) {
        throw 'You must call you server listen method';
    }

    host = host || this.options.host;
    port = port || this.options.port;

    this.httpServer.listen(port, host);

    this.log('Beseda started on ' + host + ':' + port);
}

Server.prototype.log = function(message) {
    return this.options.log(message);
}

Server.prototype.setOptions = function(options, extend) {
    this.options = Object.merge(options, extend);
}

Server.prototype._onMessage = function(client, message) {
    this.router.dispatch(client, message);
}

Server.prototype._onDisconnect = function(client) {
    if (client.session) {
        client.session.destroy();
        this.log('Session ' + session.id + ' is disconnected');
    } else {
        this.log('Client without session is disconnected')
    }

    this.emit('disconnect', client.session);
}