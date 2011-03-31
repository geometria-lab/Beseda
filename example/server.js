var connect = require('connect')
    Beseda = require('./../index.js');

var server = connect.createServer(connect.static(__dirname));
server.listen(80);

var beseda = new Beseda({
    server : server
});
//beseda.listen(80);