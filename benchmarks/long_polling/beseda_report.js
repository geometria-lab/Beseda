var redis = require('redis-node');
var util = require('util');

var redisClient = redis.createClient(6379);
var publishCount = 0;
var clientCount = 0;

var tempCount = 0;
var tempTime = 0;

redisClient.on('connected', function() {
	redisClient.llen('beseda_clients', function(err, l) {
		if (err) throw err;

		clientCount = l;

		if (l === 0) {
			killKeys();
		} else {
			var i = 0;
			while (i < l) {
				redisClient.lindex('beseda_clients', i, function(err, id) {
					if (err) throw err;

					processClient(id);
				});

				i++;
			}

			redisClient.del('beseda_clients');
		}
	});
});

function processClient(id) {
	var key = 'beseda_client:' + id;

	redisClient.llen(key, function(err, l) {
		if (err) throw err;

		publishCount += l;
		tempCount += l;

		var i = 0;
		while(i < l) {
			redisClient.lindex(key, i, function(err, time) {
				if (err) throw err;

				tempTime += parseInt(time);
				publishCount--

				if (publishCount === 0) {
					util.log('Publish count: ' + tempCount);
					util.log('Average time: ' + tempTime/tempCount);
					util.log('Client count: ' + clientCount);

					setTimeout(killKeys, 1000);
				}
			});

			i++;
		}
		
		redisClient.del(key);
	});
}

function killKeys() {
	util.log('Kill keys!');
	try {
		redisClient.keys('beseda*', function(err, keys){
			try {
				if (err) throw err;

				var keysList = keys.toString().split(',');
				while (keysList.length) {
					redisClient.del(keysList.shift(), function(err){});
				}
			} catch (error) {};
		});
	} catch (error) {};
}