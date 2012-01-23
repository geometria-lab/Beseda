var beseda = {};

beseda.inherits = function(Class, Parent) {
	var Link = function() {};
	Link.prototype = Parent.prototype;

	Class.prototype = new Link();
	Class.prototype.constructor = Class;
};
