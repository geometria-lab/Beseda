BesedaPackage.utils.cloneObject = function(object) {
	return BesedaPackage.utils.mergeObjects({}, object);
};

BesedaPackage.utils.mergeObjects = function(object, extend) {
	for (var p in extend) {
		try {
			if (extend[p].constructor == Object) {
				object[p] = BesedaPackage.utils.mergeObjects(object[p], extend[p]);
			} else {
				object[p] = extend[p];
			}
		} catch (e) {
			object[p] = extend[p];
		}
	}

	return object;
};


BesedaPackage.utils.inherits = function(Class, Parent) {
	/** @constructor */
	var Link = function() {};
	Link.prototype = Parent.prototype;

	Class.prototype = new Link();
	Class.prototype.constructor = Class;
};

BesedaPackage.utils.log = function(message) {
	if (window.console) {
		window.console.log(message);
	}
};

BesedaPackage.utils.__base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
BesedaPackage.utils.__base64charsLength = BesedaPackage.utils.__base64chars.length;

/**
 * @param {number=} length
 */
BesedaPackage.utils.uid = function(length) {
	length = length || 10;

	for (var i = 0, id = []; i < length; i++) {
		id[i] = BesedaPackage.utils.__base64chars[0 | Math.random() * BesedaPackage.utils.__base64charsLength];
	}

	return id.join('');
};
