#!/usr/bin/env node

// TODO: Refactor this shit

var util = require('util');

var cli  = require('./../vendor/cli');

var Client = require('./../client/nodejs');

cli.parse({
    host : [ 'h',   'Host',       'ip',     '127.0.0.1' ],
    port : [ 'p',   'Port',       'number', 4000 ],
    ssl  : [ 's',   'Enable SSL', 'boolean' ],

    transport : ['t', 'Transport',         'string', 'longPolling'],

    number    : ['n', 'Number of clients', 'number', 1],

    debug : ['d', 'Display debug information', 'boolean']
}, {
    publish   : 'Publish message to channel',
    subscribe : 'Subscribe to channel'
});

cli.main(function(args, options) {
    checkArgs(args);

    if (cli.command == 'publish') {
        console.log(options.number + ' clients publishing ' + (options.number * args[2]) + ' messages...\n');
    }

    var clients   = [],
        connected = 0;

    for (var i = 0; i < options.number; i++) {
        var client = new Client(options);

        client.on('connection', function() {
            if (options.debug) {
                cli.info('Client ' + this.clientId + ' connected');
            }

            if (cli.command == 'subscribe') {
                subscribe(args, options, this);
            } else {
                publish(args, options, this, args[2]/options.number);
            }
        });

        client.on('message', function(channel, data, message) {
            if (options.debug) {
                cli.info('Client ' + this.clientId + ' received: ' + JSON.stringify(message));
            } else {
                console.log(JSON.stringify(message));
            }
        });

        client.on('error', function(error) {
	        throw new Error();
            cli.error('Client ' + this.clientId + " error: " + error);
        });

        client.connect();

        clients.push(client);
    }
});

function checkArgs(args) {
    if (cli.command == 'subscribe') {
        if (!args[0]) {
            console.log("Channel not present.\n Use: beseda-client subscribe [CHANNEL]");
            process.exit(1);
        }
    } else {
        var use = 'Use: beseda-client publish CHANNEL MESSAGE [COUNT=1]';

        if (!args[0]) {
            console.log("Channel not present.\n" + use);
            process.exit(1);
        }

        if (!args[1]) {
            console.log("Message not present.\n" + use);
            process.exit(1);
        }

        args[2] = args[2] ? Number(args[2]) : 1;
    }
}

function subscribe(args, options, client) {
    var channel = args[0];

    client.subscribe(channel, function() {
        if (options.debug) {
            cli.info('Client ' + this.clientId + ' subscribed to ' + channel);
        }
    });
}

var errors = [];
var successCount = 0;
var errorCount = 0;

function publish(args, options, client, count) {
    var channel  = args[0],
        message  = args[1];

    client.removeAllListeners('error');

    var publishClosure = function() {
        if (count--) {
            client.publish(channel, message, function(error) {
                if (error) {
                    errors.push([this.clientId, error]);
                    errorCount++;
                } else {
                    successCount++;
                }

                cli.progress(errorCount + successCount / args[2]);

                publishClosure();
            });
        } else if (errorCount + successCount === args[2]) {
            for (var i = 0; i < errors.length; i++) {
                cli.error('Client ' + errors[i][0] + ' error: ' + errors[i][1]);
            }
            process.exit(0);
        }
    };

    publishClosure();
}
