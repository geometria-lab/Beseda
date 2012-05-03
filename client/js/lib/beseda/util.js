if (besedaPackage === undefined) {
    var besedaPackage = {};
}

(function(){
    var util = {};

    util.inherits = function(Class, Parent) {
        var Link = function() {};
        Link.prototype = Parent.prototype;
    
        Class.prototype = new Link();
        Class.prototype.constructor = Class;
    };
    
    besedaPackage.util = util;
})();