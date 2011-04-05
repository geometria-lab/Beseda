var fs  = require('fs'),
    url = require('url');

var Channel = require('./channel.js'),
    Session = require('./session.js');

Router = module.exports = function(server) {
    this.server = server;
}

// TOOD: HTTP Authentication

Router._routes = {
    'beseda.js' : function(dispatcher) {
        var file = __dirname + '/../../../client/js/beseda.js';
        dispatcher.sendFile(file, 'text/javascript');
    },
    'beseda.min.js' : function(dispatcher) {
        var file = __dirname + '/../../../client/js/beseda.min.js';
        dispatcher.sendFile(file, 'text/javascript');
    },
    'monitor' : function(dispatcher) {
        var file = __dirname + '/../../monitor/index.html';
        dispatcher.sendFile(file, 'text/html');
    },
    'monitor/style.css' : function(dispatcher) {
        var file = __dirname + '/../../monitor/style.css';
        dispatcher.sendFile(file, 'text/css');
    },
    'monitor/monitor.js' : function(dispatcher) {
        var file = __dirname + '/../../monitor/monitor.js';
        dispatcher.sendFile(file, 'text/javascript');
    },
    'monitor/channels' : function() {
        var channels = Channel.getAll();

        dispatcher.sendJSON();
    },
    'monitor/sessions' : function() {
        dispatcher.sendJSON();
    }
}

Router.prototype.dispatch = function(request, response) {
    var requestPath = url.parse(request.url).pathname.substr(1);

    Router._routes.forEach(function(callback, path) {
        if (requestPath == path) {
            var dispatcher = new Router.Dispatcher(request, response);

            callback(dispatcher);

            return true;
        }
    });

    return false;
}

Router.Dispatcher = function(request, response) {
    this.request = request;
    this.response = response;
}

Router.Dispatcher.prototype.sendStatic = function(file, type) {
    fs.stat(file, function (error, stat) {
        if (error) {
            this.log('Can\'t dispatch static file "' + this.request.uri + ' (' + file +')": ' + error);

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
                headers['Content-Type']   = type;

                // TODO: Impement stream and buffer for caching
                try {
                    var content = fs.readFileSync(file, 'utf8');
                } catch (e) {
                    this.log('Can\'t dispatch static file "' + this.request.uri + ' (' + file +')": ' + error);

                    response.writeHead(404);
                    response.end();

                    return;
                }

                response.writeHead(200, headers);
                response.end(content, 'utf8');
            }
        }
    }.bind(this));
}