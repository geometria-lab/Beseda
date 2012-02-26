var parseURL = function(url) {
    var pathAndSearch = url.substring(1).split('?');

	var result = {
		'path'	 : pathAndSearch[0].split('/'),
		'search' : {}
	};

	var search = pathAndSearch[1];
	if (search) {
		var i = 0,
			l = search.length;

		var sep = '&';
		var temp = [];

		var key = null;
	
		while (i < l) {

			if (search[i] === '=') {
				key = temp.join('');
				result.search[key] = '';
				
				temp = [];
			} else if (search[i] === '&') {
				if (key) {
					result.search[key] = unescape(temp.join(''));
					key = null;
				}
				
				temp = [];
			} else {
				temp.push(search[i])
			}

			++i;
		}

		if (key) {
			result.search[key] = unescape(temp.join(''));
		}
	}

	return result;
};

module.exports = parseURL;

/*
var Utils = {};

Utils.send = function(response, code, headers) {
    headers = headers || {};
    headers['Server'] = 'Beseda';
    headers['Access-Control-Allow-Origin'] = '*';

    response.writeHead(code || 200, headers);
    response.end();
};

Utils.sendJSON = function(response, json, code, headers) {
    headers = headers || {};
	headers['Server'] = 'Beseda';
	headers['Content-Type'] = 'text/json';
	headers['Access-Control-Allow-Origin'] = '*';

	response.writeHead(code || 200, headers);
	response.end(json);
};



module.exports = Utils;
*/