var fs  = require('fs'),
    url = require('url');

Router = module.exports = function(server) {
    this.server  = server;
    this._routes = [];
}

Router.prototype.get = function(path, callback) {
    var route = new Router.Route('GET', path, callback);

    this._routes.push(route);

    return this;
}

Router.prototype.post = function(path, callback) {
    var route = new Router.Route('POST', path, callback);

    this._routes.push(route);

    return this;
}

Router.prototype.dispatch = function(request, response) {
    var dispatcher = new Router.Dispatcher(this.server, request, response);

    this._routes.forEach(function(route) {
        if (route.isValid(request)) {
            dispatcher.dispatch(route);

            return dispatcher;
        }
    });

    return dispatcher;
}

Router.Route = function(method, path, callback) {
    this.method   = method;
    this.path     = path;
    this.callback = callback;
}

Router.Route.prototype.isValid = function(request) {
    var requestPath = url.parse(request.url).pathname;

    return (requestPath == this.path || requestPath == ('/' + this.path)) &&
           (this.method == request.method || (this.method == 'GET' && request.method == 'HEAD'));
}

Router.Dispatcher = function(server, request, response) {
    this.server   = server;
    this.request  = request;
    this.response = response;

    this.isDispatched = false;
}

Router.Dispatcher.prototype.dispatch = function(route) {
    this.isDispatched = true;

    var params = url.parse(this.request.url, true).query;

    route.callback(this, params);
}

Router.Dispatcher.prototype.sendFile = function(file, type) {
    fs.stat(file, function (error, stat) {
        if (error) {
            this.server.log('Can\'t send file "' + this.request.uri + ' (' + file +')": ' + error);

            this.send(404);
        } else {
            var mtime   = Date.parse(stat.mtime),
                headers = {
                    'Etag'          : JSON.stringify([stat.ino, stat.size, mtime].join('-')),
                    'Date'          : new(Date)().toUTCString(),
                    'Last-Modified' : new(Date)(stat.mtime).toUTCString(),
                    'Server'         : 'Beseda',
                    'Cache-Control'  : 'max-age=3600' };

            if (this.request.headers['if-none-match'] === headers['Etag'] &&
                Date.parse(this.request.headers['if-modified-since']) >= mtime) {

                this.send(304, headers);
            } else if (this.request.method === 'HEAD') {
                this.send(200, headers);
            } else {
                headers['Content-Length'] = stat.size;
                headers['Content-Type']   = type;

                // TODO: Impement stream and buffer for caching
                try {
                    var content = fs.readFileSync(file, 'utf8');
                } catch (e) {
                    this.server.log('Can\'t send file "' + this.request.uri + ' (' + file +')": ' + error);

                    this.send(404);

                    return;
                }

                this.response.writeHead(200, headers);
                this.response.end(content, 'utf8');
            }
        }
    }.bind(this));
}

Router.Dispatcher.prototype.sendJSON = function(data) {
    var json = JSON.stringify(data),
        headers = {
            'Server'         : 'Beseda',
            'Content-Type'   : 'text/json',
            'Content-Length' : json.length };

    this.response.writeHead(200, headers);
    this.response.end(json, 'utf8');
}

Router.Dispatcher.prototype.send = function(code, headers) {
    headers = headers || {};
    headers['Server'] = 'Beseda';

    this.response.writeHead(code, headers);
    this.response.end();
}