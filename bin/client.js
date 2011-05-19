#!/usr/bin/env node

var util = require('util');

var cli  = require('./../vendor/cli');

var Client = require('./../client/nodejs');

cli.parse({
    host : [ 'h',   'Host',       'ip',      '127.0.0.1' ],
    port : [ 'p',   'Port',       'number',  4000 ],
    ssl  : [ false, 'Enable SSL', 'boolean', false ],

    transport : ['t', 'Transport',         'string', 'longPolling'],
    number    : ['n', 'Number of clients', 'number', 1],

    verbose   : ['v', 'Display verbose information', 'boolean', false]
}, ['publish', 'subscribe']);

cli.main(function(args, options) {
    function log(clientId, message) {
        if (options.verbose) {
            util.log('Client ' + clientId + ' - ' + message);
        }
    }

    if (options.number > 1 && (cli.command == 'publish' || options.verbose)) {
        console.log(options.number + ' clients connecting...\n');
    }

    var clients   = [],
        connected = 0;
    for (var i = 0; i < options.number; i++) {
        var client = new Client(options);
        client.on('connection', function() {
            log(this.clientId, 'connected');
            connected++;
        });
        client.on('message', function(channel, data, message) {
            if (!options.verbose) {
                console.log(data);
            } else {
                log(this.clientId, JSON.stringify(message));
            }
        });
        client.on('error', function(error) {
            log(this.clientId, 'ERROR: ' + error);
        });
        client.connect();
        clients.push(client);
    }

    var interval = setInterval(function() {
        if (options.number > 1) {
            cli.progress(connected / options.number);
        }

        if (connected == options.number) {
            clearInterval(interval);
            eval(cli.command)(args, options, clients);
        }
    }, 100);
});

function subscribe(args, options, clients) {
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
}

function publish(args, options, clients) {
    var use = 'Use: beseda-client publish CHANNEL MESSAGE [COUNT=1]';

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
        count    = args[2] || 1;

    var successCount = 0,
        errorsCount  = 0,
        errors       = [];

    console.log('\n\n' + options.number + ' clients publish ' + (count * options.number) + ' messages...\n');

    for (var i = 0; i < count; i++) {
        for (var j = 0; j < clients.length; j++) {
            clients[j].publish(channel, message, function(error, m) {
                if (!error) {
                    successCount++;
                }
            });
            if (i == 0) {
                clients[j].on('error', function(error) {
                    errors.push([this.clientId, error]);
                    errorsCount++;
                });
            }
        }
    }

    var interval = setInterval(function() {
        var requestsCount = count * options.number;
        var processedRequests = successCount + errorsCount;
        var progress = processedRequests / requestsCount;

        cli.progress(progress);

        if (progress == 1) {
            clearInterval(interval);
            for (var i = 0; i < errorsCount; i++) {
                console.log(errors[i][1] + "\n");
            }
            process.exit();
        }
    }, 50);
}
