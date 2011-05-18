#!/usr/bin/env node

var cli  = require('cli'),
    util = require('util');

var Client = require('./../client/nodejs');

cli.parse({
    host : [ 'h',   'Host',       'ip',      '127.0.0.1' ],
    port : [ 'p',   'Port',       'number',  4000 ],
    ssl  : [ false, 'Enable SSL', 'boolean', false ],

    transport : ['t', 'Transport',         'string', 'longPolling'],
    number    : ['n', 'Number of clients', 'number', 10],

    interval : ['i', 'Interval of publishing messages in seconds', 'number', 1]
}, ['publish', 'subscribe']);

cli.main(function(args, options) {
    
    function log(clientId, message) {
        util.log('Client ' + clientId + ' - ' + message);
    }

    function publish(client, channel) {
        client.publish(channel, 'Hello guys!', function(error, message) {
            if (!error) {
                log(this.clientId, 'published ' + message.id + ' to ' + channel);
                setTimeout(publish.bind(null, client, channel), options.interval * 1000);
            }
        });
    }

    //var clients = [];

    var channel = args[0] || '/test';
    if (cli.command == 'subscribe') {
        console.log('Subscribe ' + options.number + ' clients to ' + channel);
    }

    for (var i = 0; i < options.number; i++) {
        var client = new Client(options);
        client.on('connection', function() {
            log(this.clientId, 'connected');
        });
        client.on('message', function(channel, data, message) {
            log(this.clientId, 'received ' + message.id + ' from ' + channel);
        });
        client.on('error', function(error) {
            log(this.clientId, 'ERROR: ' + error);
        });

        switch (cli.command) {
            case 'subscribe':
                client.subscribe(channel, function() {
                    log(this.clientId, 'subscribed to ' + channel);
                });
                break;
            case 'publish':
                publish(client, channel);
                break;
        }
    }
/*
    if (cli.command == 'publish') {
        console.log('Publish from ' + options.number + ' clients to ' + channel);
        for (var i = 0; i < clients.length; i++) {
            clients[i].publish(channel, 'Hello guys!', function(error, message) {
                if (!error) {
                    log(this.clientId, 'published ' + message.id + ' to ' + channel);
                    setTimeout()
                }
            });
        }



        setInterval(function() {

        }, options.interval * 1000);


    }
     */
});