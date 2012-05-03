var parseURL = function(url) {
    var pathAndSearch = url.substring(1).split('?'),
        result = {
		    'path'	 : pathAndSearch[0].split('/'),
		    'search' : {}
	    },
        search = pathAndSearch[1];

    if (search) {
		var i = 0,
			l = search.length,
            temp = [],
            key = null;

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
				temp.push(search[i]);
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