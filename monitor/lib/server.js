var http  = require('http'),
    https = require('https'),
    util  = require(process.binding('natives').util ? 'util' : 'sys');

var Router = require('./../../server/lib/router.js');

require('./../../server/lib/utils.js');

Server = module.exports = function(options) {
    this.setOptions({
        host : '127.0.0.1',
        port : 80,
        ssl : false,

        login    : 'admin',
        password : 'admin'
    }, options);

    /**
     *  Setup HTTP server
     **/
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

    /**
     *  Setup Router
     **/
    this.router = new Router(this);
    this.router.get('', function(dispatcher) {
        var file = __dirname + '/../static/index.html';
        dispatcher.sendFile(file, 'text/html');
    }).get('monitor.js', function(dispatcher) {
        var file = __dirname + '/../static/monitor.js';
        dispatcher.sendFile(file, 'text/javascript');
    }).get('monitor.css', function(dispatcher) {
        var file = __dirname + '/../static/monitor.css';
        dispatcher.sendFile(file, 'text/css');
    }).get('data', function(dispatcher) {
        dispatcher.sendJSON({});
    }).post('data', function(dispatcher) {
        this.data = JSON.parse(dispatcher.request.body);
        dispatcher.send(200);
    });

    this.httpServer.addListener('request', function(request, response) {
        var dispatcher = this.router.dispatch(request, response);

        if (!dispatcher.isDispatched) {
            dispatcher.send(404);
        }
    }.bind(this));
}

Server.prototype.log = function(message) {
    return util.log(message);
}

Server.prototype.setOptions = function(options, extend) {
    this.options = Object.merge(options, extend);
}

Server.prototype.listen = function(port, host) {
    host = host || this.options.host;
    port = port || this.options.port;

    try {
        this.httpServer.listen(port, host);
    } catch (e) {
        throw new Error('Cant start beseda monitor on ' + host + ':' + port + ': ' + e);
    }

    this.log('Beseda monitor started on ' + host + ':' + port);
}