var dnode = require('../');
var EventEmitter = require('events').EventEmitter;
var assert = require('assert');

exports['event emitter test'] = function () {
    var emitted = false;
    var ev = new EventEmitter;
    ev.emit = ev.emit.bind(ev);
    
    ev.on('test1', function (a, b, c) {
        assert.equal(a, 1);
        assert.equal(b, 2);
        assert.eql(c, [3,4]);
        emitted = true;
    });
    
    Server.prototype = new EventEmitter;
    function Server (client, conn) {
        assert.ok(conn.id);
        var self = this;
        self.on = self.on.bind(self);
        self.removeListener = self.removeListener.bind(self);
        self.emit = self.emit.bind(self);
        
        self.pass = function (name, em) {
            self.on(name, function () {
                var args = [].slice.apply(arguments);
                args.unshift(name);
                em.emit.apply(em, args);
            });
        };
        
        setTimeout(function () {
            self.emit('test1', 1, 2, [3,4]);
            self.emit('test2', 1337);
        }, 250);
        
        setTimeout(function () {
            assert.ok(emitted, 'test1 event not emitted');
        }, 500);
    }
    
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = dnode(Server).listen(port);
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            remote.pass('test1', ev);
            var test2_calls = 0;
            remote.on('test2', function f () {
                test2_calls ++;
                assert.ok(test2_calls == 1, 'test2 emitter not removed')
                remote.removeListener('test2', f);
                remote.emit('test2');
                conn.end();
                server.close();
            });
        });
    });
};

