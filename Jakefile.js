desc('Show tasks');
task('default', [], function(params) {
    var exec = require('child_process').exec;
    exec('jake -T', function(error, stdout, stderr) {
        console.log(stdout);
    })
});

desc('Glue and compress javascript client');
task('compressJs', [], function(params) {
    var fs = require('fs'),
        cp = require('child_process');

    var javascript = '';

	[	'JSON.js',
		'beseda/events/EventEmitter.js',
		'beseda/utils.js',
		'beseda/Client.js',
		'beseda/Router.js',
		'beseda/IO.js',
		'beseda/Transport.js',
		'beseda/transport/LongPolling.js',
		'beseda/transport/JSONPLongPolling.js',
		'beseda/transport/WebSocket.js',
		'beseda/transport/request/XHRRequest.js',
		'beseda/transport/request/JSONPRequest.js'
	].forEach(function(file) {
		javascript += fs.readFileSync('./client/js/lib/' + file) + "\n\n";
	});

    fs.writeFile('./client/js/beseda.js', javascript);

    console.log('beseda.js created.');

    cp.exec('java -jar ' + __dirname + '/vendor/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js ' + __dirname + '/client/js/beseda.js --js_output_file ' + __dirname + '/client/js/beseda.min.js', function (error, stdout, stderr) {
        if (error !== null) {
            console.log(error);
        } else {
            console.log('beseda.min.js created.');
        }
    });
});