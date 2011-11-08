var dnode = require('../');
var assert = require('assert');

exports._id = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode({ _id : 1337 }).listen(port);
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            assert.eql(remote._id, 1337);
            conn.end();
            server.close();
        });
    });
};
