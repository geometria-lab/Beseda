var dnode = require('../');
var assert = require('assert');

exports.middleware = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    var tf = setTimeout(function () {
        assert.fail('never finished');
    }, 1000);
    
    var tr = setTimeout(function () {
        assert.fail('never ready');
    }, 1000);
    
    var tc = setTimeout(function () {
        assert.fail('connection not ready');
    }, 1000);
    
    var server = dnode(function (client, conn) {
        assert.ok(!conn.zing);
        assert.ok(!client.moo);
        
        conn.on('ready', (function () {
            clearTimeout(tr);
            assert.ok(conn.zing);
            assert.ok(this.moo);
        }).bind(this));
        
        this.baz = 42;
    }).listen(port);
    
    server.use(function (client, conn) {
        conn.zing = true;
    });
    
    server.use(function (client, conn) {
        this.moo = true;
        conn.on('ready', function () {
            clearTimeout(tc);
        });
    });
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            clearTimeout(tf);
            assert.ok(remote.baz);
            conn.end();
            server.close();
        });
    });
};
