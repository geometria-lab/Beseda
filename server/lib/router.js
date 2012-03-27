var fs   = require('fs'),
    qs  = require('qs'),
    util = require('util');

var utils = require('./utils.js');

Router = module.exports = function() {
    this._routes = [];
};

Router.prototype.get = function(path, callback) {
    var route = new Router.Route(path, callback, { method: 'GET' });

    this.addRoute(route);

    return this;
};

Router.prototype.post = function(path, callback) {
    var route = new Router.Route(path, callback, { method: 'POST' });


    this.addRoute(route);

    return this;
};

Router.prototype.addRoute = function(route) {
	this._routes.push(route);

	return this;
}

Router.prototype.dispatch = function(request, response, head) {
	var result = false;
	var parsedURL = Router.Utils.parseURL(request.url);
    for (var i = 0, l = this._routes.length; i < l; i++) {
    	var route = this._routes[i];

    	if (route.isValid(request, parsedURL)) {
    		route.dispatch(request, response, parsedURL, head);
			result = true;
            break;
        }
    }
    return result;
};

Router.Route = function(path, callback, options) {
	this.__options = utils.merge({
		method   : [],
		protocol : []
	}, options);

    this.__callback = callback;

    this.__pathHash = path.split('/');
    this.__pathHash.shift();
};

Router.Route.prototype.isValid = function(request, parsedURL) {
	var result = false;

    var method        = request.method == 'HEAD' ? 'GET' : request.method,
        isValidMethod = this.__options.method.length === 0 ||
        				this.__options.method.indexOf(method) !== -1;


	if (isValidMethod) {
		result = true;

		var requestPathHash = parsedURL.path;
		
		if (this.__pathHash.length === requestPathHash.length) {
			var i = 0, 
				l = this.__pathHash.length;

			while (i < l) {
				if (this.__pathHash[i] != requestPathHash[i] &&
					this.__pathHash[i].indexOf(':') !== 0 ) {
					result = false;

					break;
				}

				++i;
			}
		} else {
			result = false;
		}
    }

    return result;
};

Router.Route.prototype.dispatch = function(request, response, parsedURL, head) {
	var parsedPath = parsedURL.path;
	var params = parsedURL.search;

	var i = 0,
		l = this.__pathHash.length;

	while (i < l) {
		if (this.__pathHash[i].indexOf(':') === 0) {
			 params[this.__pathHash[i].substring(1)] = parsedPath[i];
		}

		++i;
	}

	this.__callback(request, response, params, head);
}

Router.Utils = {};

Router.Utils.send = function(response, code, headers) {
    headers = headers || {};
    headers['Server'] = 'Beseda';
	headers['Access-Control-Allow-Origin'] = '*';

    response.writeHead(code || 200, headers);
    response.end();
};

Router.Utils.sendJSON = function(response, json, code, headers) {
    headers = headers || {};

	headers['Server'] = 'Beseda';
	headers['Content-Type'] = 'text/json';
	headers['Access-Control-Allow-Origin'] = '*';

	response.writeHead(code || 200, headers);
	response.end(json);
};

Router.Utils.sendFile = function(request, response, file, type) {
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
                    'Server'        : 'Beseda',
                    'Cache-Control' : 'max-age=3600'
                };

            if (request.headers['if-none-match'] === headers['Etag'] &&
                Date.parse(request.headers['if-modified-since']) >= mtime) {

                Router.Utils.send(response, 304, headers);
            } else if (request.method === 'HEAD') {
                this.send(200, headers);
            } else {
                headers['Content-Length'] = stat.size;
                headers['Content-Type']   = type;

                try {
                    var content = fs.readFileSync(file, 'utf8');
                } catch (e) {
                    util.log('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

                    Router.Utils.send(response, 404);

                    return;
                }

                response.writeHead(200, headers);
                response.end(content, 'utf8');
            }
        }
    });
};

Router.Utils.parseURL = function(url) {
	var pathAndSearch = url.substring(1).split('?');

	return {
		path   : pathAndSearch[0].split('/'),
		search : qs.parse(pathAndSearch[1])
	};
};
