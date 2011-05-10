var http = require('http');
var util = require('util');

var Router = require('../server/lib/router');
var IO = require('../server/lib/io');

require('v8-profiler');


var EVENT_MESSAGE = 'message';


var router = new Router();
router.get('/io/connect/:transport', handleIOConnect)

	  .get('/io/:id', handleIO)
	  .post('/io/:id', handleIO)
	  
	  .get('/index.html', handleIndex)
	  .get('/', handleIndex);

var server = http.createServer();
server.addListener('request', router.dispatch.bind(router));
server.listen(8000, '127.0.0.1');

IO.emitter.addListener(EVENT_MESSAGE, handleIOMessage);

function handleIO(request, response, params) {
	util.log(util.inspect(params));
	
	IO.processRequest(params.id, request, response);
}

function handleIOMessage(id, data) {
	util.log(id + ": " + data);
	
	IO.write(id, data);
}

function handleIOConnect(request, response, params) {
	util.log(util.inspect(params));
	
	IO.init(params.transport, request, response);
}

function handleRoute(request, response, params) {
	response.end(util.inspect(params) + '\n');
}

function handleIndex(request, response, params) {
	var file = __dirname + '/index.html';
	Router.Utils.sendFile(request, response, file, 'text/html');
}
