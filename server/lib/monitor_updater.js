var http  = require('http'),
    https = require('https');

var Channel = require('./channel.js'),
    Session = require('./session.js');

MonitorUpdater = module.exports = function(server, options) {
    this.server   = server;

    this.host     = options.host || '127.0.0.1';
    this.port     = options.port || 80;
    this.login    = options.login || 'admin';
    this.password = options.password || 'admin';
    this.ssl      = options.ssl || false;
}

MonitorUpdater.prototype.start = function() {
    if (!this._interval) {
        this._interval = setInterval(this._update.bind(this), 10000);
    }
}

MonitorUpdater.prototype.stop = function() {
    clearInterval(this._interval);
    this._interval = null;
}

MonitorUpdater.prototype._update = function() {
    var data = {
        server   : this.server.options.host + ':' + this.server.options.port,
        sessions : Session.getAll(),
        channels : Channel.getAll()
    }, json = JSON.stringify(data);

    var options = {
        host    : this.host,
        port    : this.port,
        path    : '/data',
        method  : 'POST',
        headers : {
            'Content-Type'   : 'application/x-www-form-urlencoded',
            'Content-Length' : json.length
        }
    };

    var request = (this.ssl ? https : http).request(options, function(response) {
        if (response.statusCode != 200) {
            this.server.log('Cant update monitor data: ' + response.statusCode);
        }
    });
    request.on('error', function(error) {
        this.server.log('Cant update monitor data: ' + error);
    });
    request.write(json);
    request.end();
}