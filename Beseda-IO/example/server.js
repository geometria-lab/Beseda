var Beseda = require('../server');

var server = new Beseda();
server.on('message', function(id, message) {
	server.send(id, message);
});

server.listen(4000, 'localhost');