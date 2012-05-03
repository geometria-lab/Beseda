var path  = require('path'),
    fs    = require('fs'),
    https = require('https');

var Https = function(key, cert) {
    this.__credentials = {};
    if (path.existsSync(key)) {
        this.__credentials.key = fs.readFileSync(key, 'utf8');
    } else {
        this.__credentials.key = key;
    }

    if (path.existsSync(cert)) {
        this.__credentials.cert = fs.readFileSync(cert, 'utf8');
    } else {
        this.__credentials.cert = cert;
    }
};

Https.prototype.initialize = function(beseda) {
     var server = https.createServer(this.__credentials);

     beseda.use(server);
};

module.exports = Https;