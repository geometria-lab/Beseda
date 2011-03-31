var connect = require('connect'),
    Beseda = require('./../index.js');

var server = connect.createServer(connect.static(__dirname));
server.listen(3000);

var beseda = new Beseda({ server : server });