module.exports.merge = function(object, extend) {
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

module.exports.clone = function(object) {
    return exports.merge({}, object);
};

module.exports.ensureArray = function(array) {
    return Array.isArray(array) ? array : [ array ];
};

var base64chars, base64charsLength;

module.exports.uid = function(length) {
    length = length || 10;

    if (!base64chars) {
        base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
        base64charsLength = base64chars.length;
    }

    for (var i = 0, id = []; i < length; i++) {
        id[i] = base64chars[0 | Math.random() * base64charsLength];
    }

    return id.join('');
}

module.exports.isObjectEmpty = function(object) {
    for (var p in object) {
        return false;
    }

    return true;
}