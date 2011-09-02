var http   = require('http'),
    Router = require('./../server/lib/router.js'),
    Beseda = require('./../server');

var router = new Router(),
    sendIndex = function(request, response) {
        Router.Utils.sendFile(request, response, __dirname + '/index.html', 'text/html');
    };

router.get('/', sendIndex);
router.get('/index.html', sendIndex);
router.get('/example.js', function(request, response, params) {
    Router.Utils.sendFile(request, response, __dirname + '/example.js', 'text/javascript');
});

var server = http.createServer(function(request, response) {
    if (!router.dispatch(request, response)) {
        Router.Utils.send(response, 404);
    }
});
server.listen(4000);

var beseda = new Beseda({ server : server, debug: !true });
