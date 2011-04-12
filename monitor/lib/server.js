var http  = require('http'),
    https = require('https'),
    util  = require(process.binding('natives').util ? 'util' : 'sys');

var Router = require('./../../server/lib/router.js');

require('./../../server/lib/utils.js');

Server = module.exports = function(options) {
    this.options = Object.merge({
        host : '127.0.0.1',
        port : 80,
        ssl  : false,

        login    : 'admin',
        password : 'admin'
    }, options);

    this._stats = {};

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
    }).get('/stats', function(dispatcher) {
        dispatcher.sendJSON(this._stats);
    }.bind(this)).post('/stats', function(dispatcher) {
        var body = '';

        dispatcher.request.on('data', function(data) {
            body += data;
        });

        dispatcher.request.on('end', function() {
            var stats = JSON.parse(body);

            stats.lastUpdate = Date.now();
            stats.isDown = false;

            this._stats[stats.server] = stats;

            this.log('Received stats update from ' + stats.server);
        }.bind(this));

        dispatcher.send(200);
    }.bind(this));

    this.httpServer.addListener('request', function(request, response) {
        if (this._authorize(request, response)) {
            var dispatcher = this.router.dispatch(request, response);

            if (!dispatcher.isDispatched) {
                dispatcher.send(404);
            }
        }
    }.bind(this));

    this._cleanupInterval = setInterval(this._cleanup.bind(this), 1000);
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
        'WWW-Authenticate' : 'Basic realm="Beseda Monitor"'
    });
    response.end();

    return false;
}

Server.prototype._cleanup = function() {
    var now = Date.now();

    for (var name in this._servers) {
        if (!this._servers[name].isDown && now > this._servers[name].lastUpdate + (this._servers[name].interval + 3) * 1000) {
            this.log(name + ' not updated stats and marked as down');

            this._servers[name].isDown = true;
        }
    }
}