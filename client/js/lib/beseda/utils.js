beseda.utils.cloneObject = function(object) {
	return beseda.utils.mergeObjects({}, object);
};

beseda.utils.mergeObjects = function(object, extend) {
	for (var p in extend) {
		try {
			if (extend[p].constructor == Object) {
				object[p] = beseda.utils.mergeObjects(object[p], extend[p]);
			} else {
				object[p] = extend[p];
			}
		} catch (e) {
			object[p] = extend[p];
		}
	}

	return object;
};


beseda.utils.inherits = function(Class, Parent) {
	/** @constructor */
	var Link = function() {};
	Link.prototype = Parent.prototype;

	Class.prototype = new Link();
	Class.prototype.constructor = Class;
};

beseda.utils.log = function(message) {
	if (window.console) {
		window.console.log(message);
	}
};

beseda.utils.__base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
beseda.utils.__base64charsLength = beseda.utils.__base64chars.length;

/**
 * @param {number=} length
 */
beseda.utils.uid = function(length) {
	length = length || 10;

	for (var i = 0, id = []; i < length; i++) {
		id[i] = beseda.utils.__base64chars[0 | Math.random() * beseda.utils.__base64charsLength];
	}

	return id.join('');
};
