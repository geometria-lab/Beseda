Beseda.utils = {
    uid : function() {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');
        var uid = [];

        for (var i = 0; i < 22; i++) {
            uid[i] = chars[0 | Math.random() * 64];
        }

        return uid.join('');
    },

    cloneObject : function(object) {
        return this.mergeObjects({}, object);
    },

    mergeObjects : function(object, extend) {
        for (var p in extend) {
            try {
                if (extend[p].constructor == Object) {
                    object[p] = this.mergeObjects(object[p], extend[p]);
                } else {
                    object[p] = extend[p];
                }
            } catch (e) {
                object[p] = extend[p];
            }
        }

        return object;
    },

    inherits: function(Class, Parent)
	{
		var Link = function() {};
		Link.prototype = Parent.prototype;

		Class.prototype = new Link();
		Class.prototype.constructor = Class;
		Class._super = Class.prototype._super = Parent.prototype;

		Link = null;
	}
}
