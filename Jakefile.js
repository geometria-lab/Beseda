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
        mjs = require('./vendor/minifyjs');

    var javascript = '';

	[
		'JSON.js',
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
		javascript += fs.readFileSync('./client/js/' + file) + "\n\n";
	});

    fs.writeFile('./client/js/beseda.js', javascript);

    console.log('beseda.js created.');
    /*console.log('');
    console.log('Start compress Beseda.js.');

    mjs.minify(javascript, function(error, code) {
        if (error) {
            console.log(error);
        } else {
            console.log('');
            console.log('Compression level ' + (0 | ((code.length / javascript.length) * 100)) + '%.');
            fs.writeFile('./client/js/beseda.min.js', code);
            console.log('');
            console.log('beseda.js created.');
        }
    });*/
});