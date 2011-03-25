Object.clone = function(object) {
    var newObject = {};

    for (p in object) {
        newObject[p] = p;
    }

    return newObject;
}