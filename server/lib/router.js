var fs   = require('fs'),
    url  = require('url'),
    util = require('util');

var utils = require('./utils.js');

Router = module.exports = function() {
    this._routes = [];
};

Router.prototype.get = function(path, callback) {
    var route = new Router.Route(path, callback, 'GET');

    this.addRoute(route);

    return this;
};

Router.prototype.post = function(path, callback) {
    var route = new Router.Route(path, callback, 'POST');

    this.addRoute(route);

    return this;
};

// TODO: Check duplicates?
Router.prototype.addRoute = function(route) {
	this._routes.push(route);

	return this;
}

Router.prototype.dispatch = function(request, response) {
    for (var i = 0, l = this._routes.length; i < l; i++) {
    		var route = this._routes[i];

    		if (route.isValid(request)) {
    			route.dispatch(request, response);

            return true;
        }
    }

    return false;
};

Router.Route = function(path, callback, methods) {
    this.__methods  = utils.ensureArray(methods);
    this.__callback = callback;

    this.__pathHash = path.split('/');
};

Router.Route.prototype.isValid = function(request) {
    var method        = request.method == 'HEAD' ? 'GET' : request.method,
        isValidMethod = this.__methods.length == 0 || this.__methods.indexOf(method) !== -1;

	if (isValidMethod) {
		var requestPath = url.parse(request.url).pathname;

		var requestPathHash = requestPath.split('/');
		var i = 0, 
			l = requestPathHash.length;

		while (i < l) {
			if (this.__pathHash[i] !== requestPathHash[i] &&
				this.__pathHash[i].indexOf(':') !== 0 ) {
				result = false;

				break;
			}

			++i;
		}
    }

    return result;
};

Router.Route.prototype.dispatch = function(request, response) {
	var parsedUrl = url.parse(request.url, true);
	var parsedPath = parsedUrl.pathname.split('/');

	var params = parsedUrl.query || {};

	var i = 0,
		l = parsedPath.length;

	while (i < l) {
		if (this.__pathHash[i].indexOf(':') === 0) {
			 params[this.__pathHash[i].substring(1)] = parsedPath[i];
		}

		++i;
	}


	this.__callback(request, response, params);
}

Router.Utils = {};

Router.Utils.send = function(response, code, headers) {
    headers = headers || {};
    headers['Server'] = 'Beseda';

    response.writeHead(code, headers);
    response.end();
};

Router.Utils.sendJSON = function(response, data, code, headers) {
    var json = JSON.stringify(data),
        headers = utils.mergeObjects({
            'Server'         : 'Beseda',
            'Content-Type'   : 'text/json',
            'Content-Length' : json.length }, headers || {});

	response.writeHead(code || 200, headers);
    response.end(json, 'utf8');
};

Router.Utils.sendFile = function(request, response, file, type) {
	util.log(file);
    fs.stat(file, function (error, stat) {
        if (error) {
            util.log('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

            Router.Utils.send(response, 404);
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

                Router.Utils.send(response, 304, headers);
            } else if (request.method === 'HEAD') {
                this.send(200, headers);
            } else {
                headers['Content-Length'] = stat.size;
                headers['Content-Type']   = type;

                // TODO: Impement stream and buffer for caching
                try {
                    var content = fs.readFileSync(file, 'utf8');
                } catch (e) {
                    sys.puts('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

                    Router.Utils.send(response, 404);

                    return;
                }

                response.writeHead(200, headers);
                response.end(content, 'utf8');
            }
        }
    });
};