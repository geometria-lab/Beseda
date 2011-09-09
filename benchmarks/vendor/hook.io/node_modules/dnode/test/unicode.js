var dnode = require('../');
var assert = require('assert');

exports.simple = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode({
        unicodes : function (reply) {
            reply('☔☔☔☁☼☁❄');
        }
    }).listen(port);
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            remote.unicodes(function (str) {
                assert.equal(str, '☔☔☔☁☼☁❄', 'remote unicodes == ☔☔☔☁☼☁❄');
            });
            
            setTimeout(function () {
                conn.end();
                server.close();
            }, 50);
        });
    });
};
