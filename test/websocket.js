var http = require('http');
var util = require('util');
var crypto = require('crypto');



var server = http.createServer();
server.addListener('upgrade', handleUpgrade);
server.listen(4001, '0.0.0.0');

log('Waiting for WebSocket');

function handleUpgrade(request, socket, head) {
	var connection = request.connection;

	//log("head: " + util.inspect(head));
	//log("request.headers: " + util.inspect(request.headers));

	var headers = [];
	if (request.headers['sec-websocket-key1']) {
		headers = [
			'HTTP/1.1 101 WebSocket Protocol Handshake',
			'Upgrade: WebSocket',
			'Connection: Upgrade',
			'Sec-WebSocket-Origin: ' + request.headers.origin,
			'Sec-WebSocket-Location: ws://' + request.headers.host + request.url
		];
	}
	
	connection.write(headers.concat('', '').join('\r\n'));

	//////////////////////////////////////////////////////////////////////////

	var key1 = request.headers['sec-websocket-key1'];
	var key2 = request.headers['sec-websocket-key2'];

	var keys = [key1, key2];

	if (key1 && key2) {
		var md5 = crypto.createHash('md5');

		var numKey;
		var spaceCount;

		var i = 0;
		while(i < 2) {
			numKey = parseInt(keys[i].replace(/[^\d]/g, ''));
			spaceCount = keys[i].replace(/[^ ]/g, '').length;

			numKey /= spaceCount;

			md5.update(String.fromCharCode(
				numKey >> 24 & 0xFF,
				numKey >> 16 & 0xFF,
				numKey >> 8  & 0xFF,
				numKey       & 0xFF
			));

			++i;
		}

		md5.update(head.toString('binary'));

		connection.write(md5.digest('binary'), 'binary');
	}

	connection.addListener('data', handleData.bind(connection));
}

function handleData(data) {
    this.write(data)
}

function log(message) {
	util.print(message + '\n');
}