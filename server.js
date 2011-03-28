var Beseda = require("./index");

var beseda = new Beseda({
	host : '127.0.0.1',
	port : 3000,
});
beseda.listen();