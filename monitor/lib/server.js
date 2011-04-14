var http  = require('http'),
    https = require('https'),
    util  = require(process.binding('natives').util ? 'util' : 'sys');

var io = require('./../../server/vendor/socket.io');

var Router = require('./../../server/lib/router.js');

require('./../../server/lib/utils.js');

// TODO: Change router to connect framework

Server = module.exports = function(options) {
    this.options = Object.merge({
        host : '0.0.0.0',
        port : 4001,
        ssl  : false,

        login    : 'admin',
        password : 'admin'
    }, options);

    this._servers = {};
    this._channels = {};

    /**
     *  Setup Router
     **/
    this.router = new Router(this);
    this.router.get('/', function(dispatcher) {
        var file = __dirname + '/../static/index.html';
        dispatcher.sendFile(file, 'text/html');
    }).get('/monitor.js', function(dispatcher) {
        var file = __dirname + '/../static/monitor.js';
        dispatcher.sendFile(file, 'text/javascript');
    }).get('/monitor.css', function(dispatcher) {
        var file = __dirname + '/../static/monitor.css';
        dispatcher.sendFile(file, 'text/css');
    }).post('/stats', function(dispatcher) {
        var body = '';

        dispatcher.request.on('data', function(data) {
            body += data;
        });

        dispatcher.request.on('end', function() {
            var server = JSON.parse(body);

            // Create channel diff and broadcast
            this._channels[server.name] = server.channels;
            delete server.channels

            server.lastUpdate = Date.now();
            server.isDown = false;

            this._servers[server.name] = server;

            this.socketIO.broadcast({ type : 'servers', servers : [ server ] });

            this.log('Received stats update from ' + server.name);
        }.bind(this));

        dispatcher.send(200);
    }.bind(this));

    /**
     *  Setup HTTP server
     **/
    if (this.options.ssl != false) {
        // Create https server with credentials
        var credentials = {};
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

    /**
     * Setup Socket.IO
     **/
    this.socketIO = io.listen(this.httpServer);
    this.socketIO.on('connection', this._onConnection.bind(this));

    // Add request listener with static before others
    var self = this;
    var listeners = this.httpServer.listeners('request');
    this.httpServer.removeAllListeners('request');
    this.httpServer.addListener('request', function(request, response) {
        if (self._authorize(request, response)) {
            var dispatcher = self.router.dispatch(request, response);

            if (!dispatcher.isDispatched) {
                for (var i = 0; i < listeners.length; i++) {
                    listeners[i].call(this, request, response);
                }
            }
        }
    });

    this._markAsDownInterval = setInterval(this._markAsDown.bind(this), 1000);
}

Server.prototype.log = function(message) {
    return util.log(message);
}

Server.prototype.listen = function(port, host) {
    host = host || this.options.host;
    port = port || this.options.port;

    try {
        this.httpServer.listen(port, host);
    } catch (e) {
        throw new Error('Cant start Beseda Monitor on ' + host + ':' + port + ': ' + e);
    }

    this.log('Beseda Monitor started on ' + host + ':' + port);
}

Server.prototype._authorize = function(request, response) {
    if ('authorization' in request.headers && request.headers['authorization'].indexOf('Basic ') === 0) {
        var loginAndPassword = new Buffer(request.headers['authorization'].substring(6), 'base64');
        loginAndPassword = loginAndPassword.toString('utf8').split(':');

        if (loginAndPassword[0] == this.options.login && loginAndPassword[1] == this.options.password) {
            return true;
        }
    }

    response.writeHead(401, {
        'Server'           : 'Beseda',
        'WWW-Authenticate' : 'Basic realm="Beseda Monitor"'
    });
    response.end();

    return false;
}

Server.prototype._markAsDown = function() {
    var now = Date.now();

    for (var name in this._servers) {
        var server = this._servers[name];
        if (!server.isDown && now > server.lastUpdate + (server.interval + 3) * 1000) {
            this.log(name + ' not updated stats and marked as down');

            server.isDown = true;
        }
    }
}

Server.prototype._onConnection = function(client) {
    client.on('message', this._onMessage.bind(this, null, client));
    var servers = [];
    for (var name in this._servers) {
        servers.push(this._servers[name]);
    }

    client.send({ type : 'servers', servers : servers });
}

Server.prototype._onMessage = function(message, client) {
    console.log(message);
    console.log(client);
}