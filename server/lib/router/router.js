var Route    = require('./route.js'),
    parseURL = require('./parse-url.js');

var Router = function() {
    this.__routes = [];
    this.__routesByPath = {};
};

Router.prototype.get = function(path, callback) {
    var route = new Route(path, callback, { method: 'GET' });

    this.addRoute(route);

    return this;
};

Router.prototype.post = function(path, callback) {
    var route = new Route(path, callback, { method: 'POST' });

    this.addRoute(route);

    return this;
};

Router.prototype.delete = function(path, callback) {
    var route = new Route(path, callback, { method: 'POST' });

    this.addRoute(route);

    return this;
};


Router.prototype.addRoute = function(route) {
	this.__routes.push(route);

    if (this.__routesByPath[route.path] === undefined) {
        this.__routesByPath[route.path] = [];
    }

    this.__routesByPath[route.path].push(route);

	return this;
};

Router.prototype.dispatch = function(request, response) {
	var parsedURL = parseURL(request.url);
    
    return (this.__routesByPath[parsedURL.path] !== undefined &&
            this.__dispatchFrom(request,
                                response,
                                this.__routesByPath[parsedURL.path],
                                parsedURL)
           ) || this.__dispatchFrom(request,
                                    response,
                                    this.__routes,
                                    parsedURL);
};

Router.prototype.__dispatchFrom = function(request, response, parsedURL, routes) {
    for (var i = 0, l = routes.length; i < l; i++) {
        if (routes[i].isValid(request, parsedURL)) {
            routes[i].dispatch(request, response, parsedURL);

    		return true;
        }
    }

    return false;
}

module.exports = Router;