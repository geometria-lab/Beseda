exports.clone = function(object) {
    return exports.merge({}, object);
};

exports.merge = function(object, extend) {
    for (var p in extend) {
        try {
            if (extend[p].constructor == Object) {
                object[p] = exports.merge(object[p], extend[p]);
            } else {
                object[p] = extend[p];
            }
        } catch (e) {
            object[p] = extend[p];
        }
    }

    return object;
};

exports.ensure = function(array) {
    return Array.isArray(array) ? array : [ array ];
};

exports.camelCasetoUnderscore = function(string) {
	return string.replace(/([A-Z])/g, function($1) {
		return '_' + $1.toLowerCase();
	});
};
