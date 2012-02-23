var Route = require('./route.js'),
    Utils = require('./utils.js');

var Router = function() {
    this._routes = [];
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

Router.prototype.addRoute = function(route) {
	this._routes.push(route);

	return this;
}

Router.prototype.dispatch = function(request, response) {
	var result = false;
	var parsedURL = Utils.parseURL(request.url);
    for (var i = 0, l = this._routes.length; i < l; i++) {
    	var route = this._routes[i];

    	if (route.isValid(request, parsedURL)) {
    		route.dispatch(request, response, parsedURL);
			result = true;
            break;
        }
    }
    return result;
};


module.exports = Router;