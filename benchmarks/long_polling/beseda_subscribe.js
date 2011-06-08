var util = require('util');
var Request = require('./Request');
var redis = require('redis-node');

function merge (object, extend) {
    for (var p in extend) {
        try {
            if (extend[p].constructor == Object) {
                object[p] = exports.merge(object[p], extend[p]);
            } else {
                object[p] = extend[p];
            }
        } catch (e) {
            object[p] = extend[p];
        }
    }

    return object;
};

// ssh -l kononenchik -p 30122 192.168.2.147
///////////////////////////////////////////////////////////////////////////////

var CONNECTION_OPTIONS = {
	method : 'GET',
	host   : '0.0.0.0',
	port   : '4000',
	ssl    : false,
	path   : '/beseda/io/longPolling/' + Date.now()
};

var SEND_OPTIONS = {
	method : 'PUT',
	host   : '0.0.0.0',
	port   : '4000',
	ssl    : false
};

var POLL_OPTIONS = {
	method : 'GET',
	host   : '0.0.0.0',
	port   : '4000',
	ssl    : false
};


var BesedaClient = function()  {
	this.__id = null;

	this.__connectionRequest = new Request(CONNECTION_OPTIONS);
	this.__sendRequest = null;
	this.__pollRequest = null;

	this.__connectionRequest.on('ready', this.__handleConnect.bind(this));
	this.__connectionRequest.on('error', this.__handleConnectionError.bind(this));
	this.__connectionRequest.send();
};

BesedaClient.prototype.__handleConnectionError = function() {
	util.log('Connection error');
};

BesedaClient.prototype.__handleConnect = function(data) {
	var dataObject = JSON.parse(data);

	this.__id = dataObject.connectionId;

	util.log('Connected ' + this.__id);

	redisClient.rpush('beseda_clients', this.__id, function(err) {
		if (err) throw err;
	});

	this.__pollRequest =  new Request(merge({
		path: '/beseda/io/longPolling/' + this.__id + '/' + Date.now()
	}, POLL_OPTIONS));

	this.__pollRequest.on('ready', this.__handlePoll.bind(this));
	this.__pollRequest.on('error', this.__handlePollError.bind(this));

	this.__pollRequest.send();

	this.__sendRequest =  new Request(merge({
		path: '/beseda/io/longPolling/' + this.__id + '/' + Date.now()
	}, SEND_OPTIONS));
	this.__sendRequest.on('ready', this.__handleSend.bind(this));
	this.__sendRequest.on('error', this.__handleSendError.bind(this));

	this.__sendRequest.send('[{"id":"' + Math.random() +
		'","channel":"/meta/connect","clientId":"' +
		this.__id + '"}]'
	);
};

BesedaClient.prototype.__handleSend = function(data) {
	util.log('Data sent: ' + data + ' by ' + this.__id);
};

BesedaClient.prototype.__handleSendError = function(data) {
	//util.log('Data sent error by ' + this.__id + ' ' + data);
};

BesedaClient.prototype.__handlePoll = function(data) {
	//util.log('Poll sent by ' + this.__id + '. Result: ' + data);

	try {
		var dataArray = JSON.parse(data);
		var result = dataArray[0];

		if (result.channel == '/meta/connect') {
			this.__sendRequest.send('[{"subscription":"/test","id":"' +
				Math.random() + '","channel":"/meta/subscribe","clientId":"' +
				this.__id + '"}]'
			);
		} else if (!result.channel) {
			redisClient.rpush(
				'beseda_client:' + this.__id,
				Date.now() - parseInt(result),
				function(err) {
					if (err) throw err;
				}
			);
			
			util.log(Date.now() - parseInt(result));
		}
	} catch (error) {};

	this.__pollRequest.send();
};

BesedaClient.prototype.__handlePollError = function(data) {
	//util.log('Poll error by ' + this.__id + ' ' + data);
};

///////////////////////////////////////////////////////////////////////////////

var redisClient = redis.createClient(6379);
redisClient.on('connected', function() {
	for (var i = 0; i < 200; i++) {
		new BesedaClient();
	}
});