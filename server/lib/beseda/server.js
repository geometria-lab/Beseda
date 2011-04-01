var fs          = require('fs'),
    path        = require('path'),
    url         = require('url'),
    util        = require(process.binding('natives').util ? 'util' : 'sys'),
    http        = require('http'),
    https       = require('https'),
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

        pubSub : 'memory',

        log : function(message) {
            util.log(message)
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
        if (!self._serveStatic(request, response)) {
            for (var i = 0; i < listeners.length; i++) {
                listeners[i].call(this, request, response);
            }
        }
    });

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

util.inherits(Server, process.EventEmitter);

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
		this.log('Session ' + client.session.id + ' is disconnected');
        client.session.destroy();
    } else {
        this.log('Client without session is disconnected')
    }

    this.emit('disconnect', client.session);
}

Server.prototype._serveStatic = function(request, response) {
    var path = url.parse(request.url).pathname;

    if (['/beseda.js', '/beseda.min.js'].indexOf(path) != -1) {
        var file = __dirname + '/../../../client/js' + path;

        fs.stat(file, function (error, stat) {
            if (error) {
                this.log('Can\'t serve static "' + path + '": ' + error);

                response.writeHead(404);
                response.end();
            } else {
                var mtime   = Date.parse(stat.mtime),
                    headers = {
                        'Etag'          : JSON.stringify([stat.ino, stat.size, mtime].join('-')),
                        'Date'          : new(Date)().toUTCString(),
                        'Last-Modified' : new(Date)(stat.mtime).toUTCString(),
                        'Server'         : 'Beseda',
                        'Cache-Control'  : 'max-age=3600' };

                if (request.headers['if-none-match'] === headers['Etag'] &&
                    Date.parse(request.headers['if-modified-since']) >= mtime) {

                    response.writeHead(304, headers);
                    response.end();
                } else if (request.method === 'HEAD') {
                    response.writeHead(200, headers);
                    response.end();
                } else {
                    headers['Content-Length'] = stat.size;
                    headers['Content-Type']   = 'text/javascript';

                    // TODO: Impement stream and buffer for caching
                    try {
                        var content = fs.readFileSync(file, 'utf8');
                    } catch (e) {
                        this.log('Can\'t serve static "' + path + '": ' + error);

                        response.writeHead(404);
                        response.end();

                        return;
                    }

                    response.writeHead(200, headers);
                    response.end(content, 'utf8');
                }
            }
        }.bind(this));

        return true;
    } else {
        return false;
    }
}