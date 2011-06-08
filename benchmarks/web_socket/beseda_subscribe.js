var WebSocket = require('websocket-client').WebSocket;
var util = require('util');
var redis = require('redis-node');

var BesedaClient = function() {
	util.log(":");

	this.__ws = new WebSocket('ws://0.0.0.0:4000/beseda/io/webSocket/' + Date.now());

	this.__handleOpenClosure = this.__handleOpen.bind(this);
	this.__handleDataClosure = this.__handleData.bind(this);
	this.__handleCloseClosure = this.__handleClose.bind(this);

	this.__ws.addListener('open',    this.__handleOpenClosure);
	this.__ws.addListener('message', this.__handleDataClosure);
	this.__ws.addListener('error',   this.__handleCloseClosure);
	this.__ws.addListener('close',   this.__handleCloseClosure);

	this.__handshaked = false;
	this.__id = null;
};


BesedaClient.prototype.send = function(data) {
	this.__ws.send(data);
};

BesedaClient.prototype.__handleOpen = function(event) {
	util.log('Opened');
};

BesedaClient.prototype.__handleData = function(data) {
	if (!this.__handshaked) {
		this.__handshaked = true;

		this.__id = JSON.parse(data).connectionId;

		redisClient.rpush('beseda_clients', this.__id);

		this.send('[{"id":"' + Math.random() +
			'","channel":"/meta/connect","clientId":"' +
			this.__id + '"}]'
		);
	} else {
		var result = JSON.parse(data)[0];

		if (result.channel == '/meta/connect') {
			this.send('[{"subscription":"/test","id":"' +
				Math.random() + '","channel":"/meta/subscribe","clientId":"' +
				this.__id + '"}]'
			);
		} else if (!result.channel) {
			redisClient.rpush(
				'beseda_client:' + this.__id,
				Date.now() - parseInt(result)
			);

			util.log(Date.now() - parseInt(result));
		}
	}
};

BesedaClient.prototype.__handleClose = function(event) {
	util.log('Closed');
};

var redisClient = redis.createClient(6379);
redisClient.on('connected', function() {
	for (var i = 0; i < 2500; i++) {
		new BesedaClient();
	}
});