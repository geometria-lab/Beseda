var dnode = require('../');
var assert = require('assert');

exports.unix = function () {
    var sfile = '/tmp/unix_socket_' + Math.floor(
        Math.random() * Math.pow(2, 32)
    ).toString(16);
    
    var to = setTimeout(function () {
        assert.fail('never connected');
    }, 5000);
    
    var server = dnode({ f : function (cb) { cb(1337) } }).listen(sfile);
    
    server.on('ready', function () {
        dnode.connect(sfile, function (remote, conn) {
            remote.f(function (x) {
                clearTimeout(to);
                assert.equal(x, 1337);
                server.close();
                conn.end();
            });
        });
    });
};
