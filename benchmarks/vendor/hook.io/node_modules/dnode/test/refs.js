var dnode = require('../');
var assert = require('assert');

exports.refs = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode({
        a : 1,
        b : 2,
    }).listen(port);
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            conn.end();
            server.close();
            assert.equal(remote.a, 1);
            assert.equal(remote.b, 2);
        });
    });
};
