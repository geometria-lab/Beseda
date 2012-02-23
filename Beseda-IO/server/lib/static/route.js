var util  = require('util');

var router = require('../router');

var Handler = require('./handler.js');

var Route = function(urlPath, filePath, options) {
    router.Route.call(this, urlPath, null, options);

    this.__handler  = new Handler(options);
    this.__filePath = filePath;
};

util.inherits(Route, router.Route);

Route.prototype.isValid = function(request, parsedURL) {
    var result = false;

	if (request.method == 'HEAD' || request.method == 'GET') {
		result = true;

		var requestPathHash = parsedURL.path;

        var i = 0, 
			l = this.__pathHash.length;

		while (i < l) {
			if (this.__pathHash[i] != requestPathHash[i]) {
				result = false;

				break;
			}

			++i;
		}
    }

    return result;
};

Route.prototype.dispatch = function(request, response, parsedURL) {
    var parsedPath = parsedURL.path;
	var filePath = [ this.__filePath ];

    for (var i = this.__pathHash.length - 1; i < parsedPath.length; i++) {
        filePath.push(parsedPath[i]);
    }

    this.__handler.handleRequest(
        request,
        response,
        filePath.join('/')
    );
};

module.exports = Route;