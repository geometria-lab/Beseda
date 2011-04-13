var fs          = require('fs'),
    path        = require('path'),
    util        = require(process.binding('natives').util ? 'util' : 'sys'),
    http        = require('http'),
    https       = require('https'),
    io          = require('./../vendor/socket.io');

var Router         = require('./router.js'),
    MessageRouter  = require('./message_router.js'),
    MonitorUpdater = require('./monitor_updater.js');

require('./utils.js');

// TODO: Change router to connect framework

Server = module.exports = function(options) {
    process.EventEmitter.call(this);

    this.options = Object.merge({
        host : '0.0.0.0',
        port : 3000,
        ssl  : false,

        server : null,

        socketIO : {},

        pubSub : 'memory',

        monitor : false,

        log : function(message) {
            util.log(message)
        },

        connectionTimeout     : 2000,
        subscriptionTimeout   : 100,
        publicationTimeout    : 100,
        unsubscriptionTimeout : 100
    }, options);

    /**
     *  Setup HTTP server
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

    /**
     *  Setup Routers
     **/
    this.router = new Router(this);
    this.router.get('/beseda.js', function(dispatcher) {
        var file = __dirname + '/../../client/js/beseda.js';
        dispatcher.sendFile(file, 'text/javascript');
    }).get('/beseda.min.js', function(dispatcher) {
        var file = __dirname + '/../../client/js/beseda.min.js';
        dispatcher.sendFile(file, 'text/javascript');
    });
    this.messageRouter = new MessageRouter(this);

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

    // Add request listener with static before others
    var self = this;
    var listeners = this.httpServer.listeners('request');
    this.httpServer.removeAllListeners('request');
    this.httpServer.addListener('request', function(request, response) {
        var dispatcher = self.router.dispatch(request, response);

        if (!dispatcher.isDispatched) {
            for (var i = 0; i < listeners.length; i++) {
                listeners[i].call(this, request, response);
            }
        }
    });

    /**
     *  Setup PubSub
     **/
    if (typeof this.options.pubSub == 'string') {
        var PubSub = require('./pubsub/' + this.options.pubSub);
        this.pubSub = new PubSub();
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

    /**
     *  Setup Monitor
     **/
    if (this.options.monitor) {
        this.monitor = new MonitorUpdater(this, this.options.monitor);
        this.monitor.start();
    }

    if (this._isHTTPServerOpened()) {
        this._logBesedaStarted();
    }
}

util.inherits(Server, process.EventEmitter);

Server.prototype.listen = function(port, host) {
    if (this._isHTTPServerOpened()) {
        throw new Error('HTTP server already listen');
    }

    host = host || this.options.host;
    port = port || this.options.port;

    try {
        this.httpServer.listen(port, host);
    } catch (e) {
        throw new Error('Cant start beseda on ' + host + ':' + port + ': ' + e);
    }

    this._logBesedaStarted();
}

Server.prototype.log = function(message) {
    return this.options.log(message);
}

Server.prototype._onMessage = function(client, message) {
    this.messageRouter.dispatch(client, message);
}

Server.prototype._onDisconnect = function(client) {
    if (client.session) {
		this.log('Session ' + client.session.id + ' is disconnected');
        client.session.destroy();
    } else {
        this.log('Client without session is disconnected')
    }

    this.emit('disconnect', client.session);
}

Server.prototype._isHTTPServerOpened = function() {
    return typeof this.httpServer.fd === 'number';
}

Server.prototype._logBesedaStarted = function() {
    var serverAddress = this.httpServer.address();

    this.log('Beseda started on ' + serverAddress.address + ':' + serverAddress.port);
}