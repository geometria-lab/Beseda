#!/usr/bin/env node

var cli  = require('cli'),
    util = require('util');

var Beseda = require('./../server');

cli.parse({
    host : [ 'h',   'Host', 'ip', '127.0.0.1' ],
    port : [ 'p',   'Port', 'number', 4000 ],
    ssl  : [ false, 'SSL',  'boolean', false ],

    pubSub  : [ false, 'Pub/Sub engine', 'string',  'memory' ],
    monitor : [ 'm',   'Enable monitor', 'boolean', 0 ]
});

cli.main(function(args, options) {
    options.server = {
        host : options.host,
        port : options.port,
        ssl  : options.ssl
    }

    var beseda = new Beseda(options);
    beseda.listen();
});