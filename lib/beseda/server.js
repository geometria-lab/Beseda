var fs          = require('fs'),
    path        = require('path'),
    sys         = require('sys'),
    http        = require('http'),
    https       = require('https'),
    nodeStatic  = require('node-static'),
    io          = require('/../../vendor/socket.io');

var Options     = require('./options'),
    Router      = require('./router'),
    Session     = require('./session');

require('./ext');

Server = module.exports = function(options) {
    process.EventEmitter.call(this);

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
    this.socketIO.on('connection', this._onConnection.bind(this));

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

Server.prototype._onConnection = function(client) {
    // TODO: Replace closures
    client.on('message', function(message) {
        this._onMessage(client, message);
    }.bind(this));

    client.on('disconnect', function(){
        this._onDisconnect(client);
    }.bind(this));
}

Server.prototype._onMessage = function(client, message) {
    this.router.dispatch(client, message);
}

Server.prototype._onDisconnect = function(client) {
    var session = Session.get(client.session_id);

    if (session) {
        session.destroy();
    } else {
        throw 'Session ' + client.session_id + ' not found';
    }

    this.emit('disconnect', session);
}