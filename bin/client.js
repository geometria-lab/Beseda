#!/usr/bin/env node

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
    function log(clientId, message, force) {
        if (options.debug || force) {
            util.log('Client ' + clientId + ' - ' + message);
        }
    }

    checkArgs(args);

    var clients   = [],
        connected = 0;
    
    for (var i = 0; i < options.number; i++) {
        var client = new Client(options);

        client.on('connection', function() {
            util.log(this.clientId + ' connected');

            if (cli.command == 'subscribe') {
            		subscribe(args, this)
            } else {
            		publish(args, this, args[2]/options.number);
            }
        });

        client.on('message', function(channel, data, message) {
            util.print(this.clientId + ": " + message.id + '\n');
        });
        
        client.on('error', function(error) {
             util.print(this.clientId + ": " + error + '\n');
        });
        
        client.connect();
        
        clients.push(client);
    }
});
    
function checkArgs(args) {
    if (cli.command == 'subscribe') {
    		if (!args[0]) {
        		console.log("Channel not present.\n Use: beseda-client subscribe [CHANNEL]");
    		}
    } else {
    		var use = 'Use: beseda-client publish CHANNEL MESSAGE [COUNT=1]';

		if (!args[0]) {
		    console.log("Channel not present.\n" + use);
		    return;
		}

		if (!args[1]) {
		    console.log("Message not present.\n" + use);
		    return;
		}
    }
}

function subscribe(args, client) {
    var channel = args[0];

    client.subscribe(channel, function() {
        util.log(this.clientId + ' subscribed to ' + channel);
    });
}

var successCount = 0;
var errorCount = 0; 

function publish(args, client, count) {

    var channel  = args[0],
        message  = args[1];

   	var clientErrorCount = 0;
   	var clientSuccessCount = 0;
   	
    var publishClosure = function() {
    		if (--count) {
			client.publish(channel, message, function(error) {
				error ? errorCount++ : successCount++;
				error ? clientErrorCount++ : clientSuccessCount++;

				util.print(error ? 'e' : '.');
			
				publishClosure();
			});
		} else {
			//util.log("CLIENT " + client.clientId + " ERROR COUNT: " + clientErrorCount);			
			//util.log("CLIENT " + client.clientId + " SUCCESS COUNT: " + clientSuccessCount);
			
			if (errorCount + successCount == args[2]) {
				util.log("GLOBAL ERROR COUNT: " + errorCount);			
				util.log("GLOBAL SUCCESS COUNT: " + successCount);
			}
		}
    };

    publishClosure();

}
