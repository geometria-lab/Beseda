var Route = function(path, callback, options) {
    this.__options = {
		method   : [],
		protocol : []
	};

    for (var name in options) {
        this.__options[name] = options[name];
    }

    this.__callback = callback;

    this.__pathHash = path.split('/');
    this.__pathHash.shift();
};

Route.prototype.isValid = function(request, parsedURL) {
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

Route.prototype.dispatch = function(request, response, parsedURL) {
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

	this.__callback(request, response, params);
};

module.exports = Route;