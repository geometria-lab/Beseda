var dnode = require('../');
var assert = require('assert');

exports.recon = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var scounts = { connect : 0, ready : 0 };
    var ccounts = { connect : 0, ready : 0 };
    
    var server = dnode(function (remote, conn) {
        scounts.connect ++;
        conn.on('ready', function () {
            scounts.ready ++;
        });
    }).listen(port);
    
    var alive = true;
    
    dnode(function (remote, conn) {
        ccounts.connect ++;
        conn.on('ready', function () {
            ccounts.ready ++;
            setTimeout(function () {
                if (ccounts.ready >= 4) {
                    conn.end();
                }
                else {
                    conn.stream.end();
                }
            }, 25);
        });
        
    }).connect(port, { reconnect : 100 });
    
    setTimeout(function () {
        assert.ok(scounts.connect >= 2);
        assert.ok(scounts.ready >= 2);
        
        assert.eql(ccounts.connect, scounts.connect);
        assert.eql(ccounts.ready, scounts.ready);
        
        server.close();
        alive = false;
    }, 1000);
};
