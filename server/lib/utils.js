Object.clone = function(object) {
    return Object.merge({}, object);
}

Object.merge = function(object, extend) {
    for (var p in extend) {
        try {
            if (extend[p].constructor == Object) {
                object[p] = this._mergeObjects(object[p], extend[p]);
            } else {
                object[p] = extend[p];
            }
        } catch (e) {
            object[p] = extend[p];
        }
    }

    return object;
}

Array.ensure = function(array) {
    return Array.isArray(array) ? array : [ array ];
}