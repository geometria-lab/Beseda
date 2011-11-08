var assert = require('assert');
var dnode = require('../');
var http = require('http');
var express = require('express');

exports.checkCookieHTTP = function () {
    var port = Math.floor(10000 + (Math.random() * Math.pow(2,16) - 10000));
    
    var web = http.createServer(function (req, res) {
        res.setHeader('set-cookie', [ 'foo=bar' ]);
        
        if (req.url === '/') {
            res.setStatus(200);
            res.setHeader('content-type', 'text/html');
            res.end('pow');
        }
    });
    var server = dnode().listen(web, { io : { log : null } });
    
    web.listen(port, function () {
        var req = {
            host : 'localhost',
            port : port,
            path : '/dnode.js',
        };
        http.get(req, function (res) {
            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['content-type'], 'text/javascript');
            assert.deepEqual(res.headers['set-cookie'], ['foo=bar']);
            
            web.close();
            server.end();
        });
    });
};

exports.checkCookieExpress = function () {
    var port = Math.floor(10000 + (Math.random() * Math.pow(2,16) - 10000));
    
    var app = express.createServer();
    app.use(function (req, res, next) {
        res.setHeader('set-cookie', [ 'foo=bar' ]);
        next();
    }); 
    
    app.get('/', function (req, res) {
        res.setStatus(200);
        res.setHeader('content-type', 'text/html');
        res.end('pow');
    });
    
    var server = dnode().listen(app, { io : { log : null } });
    
    app.listen(port, function () {
        var req = {
            host : 'localhost',
            port : port,
            path : '/dnode.js',
        };
        http.get(req, function (res) {
            assert.equal(res.statusCode, 200);
            assert.equal(res.headers['set-cookie'], 'foo=bar');
            assert.equal(res.headers['content-type'], 'text/javascript');
            
            app.close();
            server.end();
        });
    });
};
