var dnode = require('../')
var util = require('util');
var assert = require('assert');

exports.simple = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode({
        timesTen : function (n,reply) {
            assert.equal(n.number, 5);
            reply(n.number * 10);
        },
        print : function (n,reply) {
            reply(sys.inspect(n));
        },
    }).listen(port);
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            var args = {
                number : 5,
                func : function () {},
            };
            
            remote.timesTen(args, function (m) {
                assert.equal(m, 50, '5 * 10 == 50');
                conn.end();
                server.close();
            });
        });
    });
};
