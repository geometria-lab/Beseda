var assert = require('assert');
var dnode = require('../');
var net = require('net');

exports.stream = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode({
        meow : function f (g) { g('cats') }
    });
    
    var netServer = net.createServer();
    server.listen(netServer);
    
    var to = setTimeout(function () {
        assert.fail();
    }, 5000);
    
    var times = 0;
    netServer.listen(port, function () {
        var netClient = net.createConnection(port);
        dnode.connect(netClient, function (remote) {
            remote.meow(function (cats) {
                clearTimeout(to);
                assert.equal(cats, 'cats');
                
                netClient.end();
                netServer.close();
            });
        });
    });
};
