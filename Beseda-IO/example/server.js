var http  = require('http');
var beseda = require('../server/lib');

var server = new beseda.Server();
server.on('message', function(id, message) {
	server.send(id, message);
});

server.listen(4000, 'localhost');