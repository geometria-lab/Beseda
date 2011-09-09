var EventEmitter = require('events').EventEmitter;
var io = require('socket.io');
var fs = require('fs');
var browserify = require('browserify');

var dnodeSrc = 'var DNode = (function () {'
    + browserify.bundle({ require : 'dnode' })
    + '; return require("dnode") })()'
;

module.exports = function (webserver, mount, ioOptions) {
    var sock = io.listen(webserver, ioOptions);
    var server = new EventEmitter;
    
    if (mount && webserver.use) {
        webserver.use(function (req, res, next) {
            if (req.url === mount) {
                res.statusCode = 200;
                res.setHeader('content-type', 'text/javascript');
                res.end(dnodeSrc);
            }
            else next()
        });
    }
    else if (mount) {
        if (!webserver._events) webserver._events = {};
        var ev = webserver._events;
        
        if (!ev.request) ev.request = [];
        if (!Array.isArray(ev.request)) ev.request = [ ev.request ];
        
        ev.request.push(function (req, res) {
            if (!res.finished && req.url === mount) {
                res.statusCode = 200;
                res.setHeader('content-type', 'text/javascript');
                res.end(dnodeSrc);
            }
        });
    }
    
    sock.on('connection', function (client) {
        var stream = new EventEmitter;
        stream.socketio = client;
        stream.readable = true;
        stream.writable = true;
        
        stream.write = client.send.bind(client);
        stream.end = client.connection.end.bind(client.connection);
        stream.destroy = client.connection.destroy.bind(client.connection);
        
        client.on('message', stream.emit.bind(stream, 'data'));
        client.on('error', stream.emit.bind(stream, 'error'));
        
        client.on('disconnect', function () {
            stream.writable = false;
            stream.readable = false;
            stream.emit('end');
        });
        
        server.emit('connection', stream);
    });
    
    return server;
};
