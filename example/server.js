try {
    var connect = require('connect');
} catch (e) {
    throw 'You need install connect module: "sudo npm install connect"';
}

var Beseda = require('./../index.js'),
    Monitor = require('./../monitor');

var server = connect.createServer(connect.static(__dirname));
server.listen(4000);

var beseda = new Beseda({ server : server });

var monitor = new Monitor();
monitor.listen();