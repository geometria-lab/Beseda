var fs    = require('fs'),
    path  = require('path'),
    util  = require('util'),
    http  = require('http'),
    https = require('https');

var IO             = require('./io.js'),
	Router         = require('./router.js'),
    MessageRouter  = require('./message_router.js');
    //MonitorUpdater = require('./monitor_updater.js');

var utils = require('./utils.js');

// TODO: initialize options via setters

Server = module.exports = function(options) {
    process.EventEmitter.call(this);

    var defaultOptions = {
        server  : {
		    host : '0.0.0.0',
		    port : 4000,
		    ssl  : false
		},
        pubSub  : 'memory',
        monitor : false,

        transports : [ 'longPolling', 'JSONPLongPolling' ],
        transportOptions : { longPolling : { reconnectTimeout : 10 } },

        connectionTimeout     : 2000, //TODO: Change to seconds
        subscriptionTimeout   : 100,
        publicationTimeout    : 100,
        unsubscriptionTimeout : 100
    };

    this.options = utils.merge(defaultOptions, options);

    /**
     *  Setup HTTP server
     **/
    if (this.options.server.constructor == Object) {
        // Create own http server from options
        if (this.options.server.ssl != false) {
            // Create https server with credentials
            var credentials = {};
            if (path.existsSync(this.options.server.ssl.key)) {
                credentials.key = fs.readFileSync(this.options.server.ssl.key, 'utf8');
            } else {
                credentials.key = this.options.server.ssl.key;
            }

            if (path.existsSync(this.options.server.ssl.cert)) {
                credentials.cert = fs.readFileSync(this.options.server.ssl.cert, 'utf8');
            } else {
                credentials.cert = this.options.server.ssl.cert;
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
    this.router = new Router();
    this.router.get('/beseda/js/:filename', function(request, response, params) {
		var file = __dirname + '/../../client/js/' + params.filename;
		Router.Utils.sendFile(request, response, file, 'text/javascript');
	});

    this.messageRouter = new MessageRouter(this);

	/**
     *  Setup IO
     **/
	this.io = new IO(this);
    this.io.on('message', this.messageRouter.dispatch.bind(this));
    this.io.on('disconnect', this._onDisconnect.bind(this));

    // Add request listener with static before others
    var self = this;
    var listeners = this.httpServer.listeners('request');
    this.httpServer.removeAllListeners('request');
    this.httpServer.addListener('request', function(request, response) {
        if (!self.router.dispatch(request, response)) {
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
        var pubSubOptions = utils.clone(this.options.pubSub);
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
};

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
};

Server.prototype._onDisconnect = function(connectionId) {
    var session = Session.get(connectionId);

    if (session) {
        util.log('Session ' + session.id + ' is disconnected');
        this.emit('disconnect', session);
        session.destroy();
    } else {
        util.log('Client without session is disconnected');
    }
};

Server.prototype._isHTTPServerOpened = function() {
    return typeof this.httpServer.fd === 'number';
};

Server.prototype._logBesedaStarted = function() {
    var serverAddress = this.httpServer.address();

    util.log('Beseda started on ' + serverAddress.address + ':' + serverAddress.port);
};
