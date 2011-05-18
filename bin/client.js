#!/usr/bin/env node

var cli  = require('cli'),
    util = require('util');

var Client = require('./../client/nodejs');

cli.parse({
    host : [ 'h',   'Host',       'ip',      '127.0.0.1' ],
    port : [ 'p',   'Port',       'number',  4000 ],
    ssl  : [ false, 'Enable SSL', 'boolean', false ],

    transport : ['t', 'Transport',         'string', 'longPolling'],
    number    : ['n', 'Number of clients', 'number', 1],

    verbose   : ['v', 'Display verbose information', 'boolean', true]
}, ['publish', 'subscribe']);

cli.main(function(args, options) {
    function log(clientId, message) {
        if (options.verbose) {
            util.log('Client ' + clientId + ' - ' + message);
        }
    }

    var clients = [];
    for (var i = 0; i < options.number; i++) {
        var client = new Client(options);
        client.on('connection', function() {
            log(this.clientId, 'connected');
        });
        client.on('message', function(channel, data, message) {
            if (options.verbose) {
                log(this.clientId, JSON.stringify(message));
            } else {
                console.log(data);
            }
        });
        client.on('error', function(error) {
            log(this.clientId, 'ERROR: ' + error);
        });
        clients.push(client);
    }

    switch (cli.command) {
        case 'subscribe':
            if (!args[0]) {
                console.log("Channel not present.\n Use: beseda-client subscribe [CHANNEL]");
                return;
            }

            var channel = args[0];

            for (var i = 0; i < clients.number; i++) {
                client.subscribe(channel, function() {
                    log(this.clientId, 'subscribed to ' + channel);
                });
            }

            break;
        case 'publish':
            var use = 'Use: beseda-client publish CHANNEL MESSAGE [REPEAT] [INTERVAL]';

            if (!args[0]) {
                console.log("Channel not present.\n" + use);
                return;
            }

            if (!args[1]) {
                console.log("Message not present.\n" + use);
                return;
            }

            var channel  = args[0],
                message  = args[1],
                repeat   = args[2] || 1,
                interval = args[3] || 1,
                i        = 0;

            var intervalLink = setInterval(function() {
                if (i >= repeat) {
                    clearInterval(intervalLink);
                    return;
                }
                i++;
                for (var i = 0; i < clients.number; i++) {
                    clients[i].publish(channel, message, function(error, m) {
                        if (!error) {
                            log(this.clientId, 'published ' + m.id + ' to ' + channel);
                        }
                    });
                }
            }, interval * 1000);
            break;
    }
});