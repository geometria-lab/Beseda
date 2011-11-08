var dnode = require('../');
var assert = require('assert');

exports.simple = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode({
        timesTen : function (n,reply) {
            assert.equal(n, 50);
            reply(n * 10);
        },
        moo : function (reply) { reply(100) },
        sTimesTen : function (n, cb) {
            assert.equal(n, 5);
            cb(n * 10);
        },
    }).listen(port.toString()); // test for stringified ports too why not
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            assert.ok(conn.id);
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            
            remote.moo(function (x) {
                assert.equal(x, 100, 'remote moo == 100');
            });
            remote.sTimesTen(5, function (m) {
                assert.equal(m, 50, '5 * 10 == 50');
                remote.timesTen(m, function (n) {
                    assert.equal(n, 500, '50 * 10 == 500');
                    conn.end();
                    server.close();
                });
            });
        });
    });
};
