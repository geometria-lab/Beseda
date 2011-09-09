var dnode = require('../');
var util = require('util');
var assert = require('assert');

exports['circular refs'] = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode({
        sendObj : function (ref, f) {
            assert.equal(ref.a, 1);
            assert.equal(ref.b, 2);
            assert.eql(ref.c, ref);
            
            ref.d = ref.c;
            
            f(ref);
        },
    }).listen(port);
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            var obj = { a : 1, b : 2 };
            obj.c = obj;
            
            remote.sendObj(obj, function (ref) {
                assert.equal(ref.a, 1);
                assert.equal(ref.b, 2);
                assert.eql(ref.c, ref);
                assert.eql(ref.d, ref);
                conn.end();
                server.close();
            });
        });
    });
};
