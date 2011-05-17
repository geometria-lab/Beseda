var cli = require('cli');

var Client = require('./../client/nodejs');

cli.parse({
    host : [ 'h', 'Beseda host', 'ip', '127.0.0.1' ],
    port : [ 'p', 'Beseda port', 'number', 4000 ],
    ssl  : [ false, 'Connect to Beseda via ssl', 'boolean', false ],

    transport : ['t', 'Transport', 'string', 'longPolling'],
    clients   : ['c', 'Number of clients', 'number', 10],
    channel   : ['ch', 'Channel to subscribe', 'number', '/test']
});

cli.main(function(args, options) {
    var clients = [];

    for (var i = 0; i < options.clients; i++) {
        var client = new Client(options);
        var connectionId = client.connect();
        clients.push(client);

        this.info('Client ' + i + ' connected: ' + connectionId);
    }
/*

    var server, middleware = [];

    if (options.log) {
        this.debug('Enabling logging');
        middleware.push(require('creationix/log')());
    }

    this.debug('Serving files from ' + options.serve);
    middleware.push(require('creationix/static')('/', options.serve, 'index.html'));

    server = this.createServer(middleware).listen(options.port);

    this.ok('Listening on port ' + options.port);
    */
});

// подключиться

// поллинг для каждого клиента

// отдельный скрипт который