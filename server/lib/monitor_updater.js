var http  = require('http'),
    https = require('https'),
    path  = require('path');

var Channel = require('./channel.js'),
    Session = require('./session.js');

require('./utils.js');

MonitorUpdater = module.exports = function(server, options) {
    this.server    = server;
    this._interval = null;

    this.options = Object.merge({
        name : null,

        host : '127.0.0.1',
        port : options.ssl ? 443 : 4001,
        ssl  : false,

        login    : 'admin',
        password : 'admin',

        interval : 10
    }, options);

    this._credentials = false;
    if (this.options.ssl && this.options.ssl.constructor == Object) {
        this._credentials = {};

        if (this.options.ssl.key != undefined) {
            if (path.existsSync(this.options.ssl.key)) {
                this._credentials.key = fs.readFileSync(this.options.ssl.key, 'utf8');
            } else {
                this._credentials.key = this.options.ssl.key;
            }
        }

        if (this.options.ssl.cert != undefined) {
            if (path.existsSync(this.options.ssl.cert)) {
                this._credentials.cert = fs.readFileSync(this.options.ssl.cert, 'utf8');
            } else {
                this._credentials.cert = this.options.ssl.cert;
            }
        }

        if (this.options.ssl.ca != undefined) {
            if (path.existsSync(this.options.ssl.ca)) {
                this._credentials.ca = fs.readFileSync(this.options.ssl.ca, 'utf8');
            } else {
                this._credentials.ca = this.options.ssl.ca;
            }
        }
    }

    this._stats = {};

    for (var i = 0; i < MonitorUpdater._statFields.length; i++) {
        var field = MonitorUpdater._statFields[i];
        this._stats[field + 'Timestamp'] = null;
        this._stats[field + 'Count'] = 0;
    }
}

MonitorUpdater._statFields = ['connection', 'declinedConnection', 'subscription',
                              'declinedSubscription', 'publication', 'declinedPublication'];

MonitorUpdater.prototype.start = function() {
    if (!this._interval) {
        this._interval = setInterval(this.update.bind(this), this.options.interval * 1000);
    }
}

MonitorUpdater.prototype.stop = function() {
    clearInterval(this._interval);
    this._interval = null;
}

MonitorUpdater.prototype.increment = function(field) {
    if (!field in MonitorUpdater._statFields) {
        throw new Error('Undefined stats field ' + field);
    }

    this._stats[field + 'Timestamp'] = Date.now();
    this._stats[field + 'Count']++;
}

MonitorUpdater.prototype.update = function() {
    // Get server name
    try {
        if (this.options.name === null) {
            var serverAddress = this.server.httpServer.address(),
                serverName = serverAddress.address + ':' + serverAddress.port;
        } else {
            var serverName = this.options.name;
        }
    } catch(e) {
        throw new Error('Cant update monitor data: Beseda not started!');
    }

    // Channels
    var strippedChannels = [],
        channels = Channel.getAll();
    for (var name in channels) {
        if (channels.hasOwnProperty(name)) {
            var subscriptions = [];
            for (var sessionId in channels[name].subscriptions) {
                subscriptions.push(sessionId);
            }

            var channel = {
                name               : channels[name].name,
                subscriptions      : subscriptions,
                createdTimestamp   : channels[name].createdTimestamp,
                receivedTimestamp  : channels[name].receivedTimestamp,
                receivedCount      : channels[name].receivedCount,
                publishedTimestamp : channels[name].publishedTimestamp,
                publishedCount     : channels[name].publishedCount
            };

            strippedChannels.push(channel);
        }
    }

    // Sessions
    var sessionsCount = 0,
        sessions      = Session.getAll();
    for (var sessionId in sessions) {
        if (sessions.hasOwnProperty(sessionId)) {
            sessionsCount++;
        }
    }

    // All data
    var data = {
        name          : serverName,
        channelsCount : strippedChannels.length,
        sessionsCount : sessionsCount,
        channels      : strippedChannels,
        interval      : this.options.interval
    }

    for (var i = 0; i < MonitorUpdater._statFields.length; i++) {
        var field = MonitorUpdater._statFields[i];

        data[field + 'Timestamp'] = this._stats[field + 'Timestamp'];
        data[field + 'Count'] = this._stats[field + 'Count'];
    }

    var json = JSON.stringify(data);

    // Post data to monitor
    var options = {
        host    : this.options.host,
        port    : this.options.port,
        path    : '/stats',
        method  : 'POST',
        headers : {
            'Content-Type'   : 'application/x-www-form-urlencoded',
            'Content-Length' : json.length,
            'Authorization'  : 'Basic ' + new Buffer(this.options.login + ':' + this.options.password).toString('base64')
        }
    };

    if (this._credentials) {
        options = Object.merge(options, this._credentials);
    }

    var request = (this.options.ssl ? https : http).request(options, function(response) {
        if (response.headers.server == undefined || response.headers.server != 'Beseda') {
            throw new Error('Invalid Monitor server ' + this.options.host + ':' + this.options.port);
        } else if (response.statusCode == 401) {
            throw new Error('Invalid Monitor login (' + this.options.login + ') and password (' + this.options.password + ')');
        } else if (response.statusCode != 200) {
            this.server.log('Cant update Monitor stats: ' + response.statusCode);
        }
    }.bind(this));

    request.on('error', function(error) {
        this.server.log('Cant update monitor data: ' + error);
    }.bind(this));

    request.write(json);
    request.end();
}