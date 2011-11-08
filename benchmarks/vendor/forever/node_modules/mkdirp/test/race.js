var assert = require('assert');
var mkdirp = require('../').mkdirp;
var path = require('path');
var fs = require('fs');

exports.race = function () {
    var ps = [ '', 'tmp' ];
    
    for (var i = 0; i < 25; i++) {
        var dir = Math.floor(Math.random() * Math.pow(16,4)).toString(16);
        ps.push(dir);
    }
    var file = ps.join('/');
    mk(file);
    mk(file);
    
    function mk (file) {
        mkdirp(file, 0755, function (err) {
            if (err) assert.fail(err);
            else path.exists(file, function (ex) {
                if (!ex) assert.fail('file not created')
                else fs.stat(file, function (err, stat) {
                    if (err) assert.fail(err)
                    else {
                        assert.eql(stat.mode & 0777, 0755);
                        assert.ok(stat.isDirectory(), 'target not a directory');
                    }
                })
            })
        });
    }
};
