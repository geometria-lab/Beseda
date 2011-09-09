var dnode = require('../');
var assert = require('assert');

exports['object ref tests'] = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var obj = { a : 1, b : 2, f : function (n,g) { g(n * 20) } };
    
    var server = dnode({
        getObject : function (f) { f(obj) },
    }).listen(port);
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            remote.getObject(function (rObj) {
                assert.equal(rObj.a, 1);
                assert.equal(rObj.b, 2);
                assert.equal(typeof rObj.f, 'function');
                rObj.a += 100; rObj.b += 100;
                assert.equal(obj.a, 1);
                assert.equal(obj.b, 2);
                assert.notEqual(obj.f, rObj.g);
                assert.equal(typeof obj.f, 'function');
                rObj.f(13, function (res) {
                    assert.equal(res, 260);
                    conn.end();
                    server.close();
                });
            });
        });
    });
};
