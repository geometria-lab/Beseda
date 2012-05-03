var Beseda = require('../lib/beseda.js');

var beseda = new Beseda();

beseda.use(new Beseda.Https())
      .use(new Beseda.Static())
      .on('message', function(id, message) {
          beseda.send(id, message);
      }).listen(4000, 'localhost');