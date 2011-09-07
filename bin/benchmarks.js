#!/usr/bin/env node

var cli  = require('cli');
var util = require('util');
var http = require('http');
var fs = require('fs');
var Benchmark = require('../benchmarks/lib/benchmark.js');

cli.parse({
    host : [ 'h',   'Host', 'ip', '127.0.0.1' ],
    port : [ 'p',   'Port', 'number', 4000 ],
    ssl  : [ false, 'SSL',  'boolean', false ],

    pubSub  : [ false, 'Pub/Sub engine', 'string',  'memory' ],
    monitor : [ 'm',   'Enable monitor', 'boolean', 0 ],

    debug : ['d', 'Display debug information', 'boolean', false]
}, {});

cli.main(function(args, options) {
	var config = JSON.parse(fs.readFileSync( 'benchmarks/config.json', 'utf8'));

	var benchmark = new Benchmark(config);
	benchmark.on('finish', function() {
		var results = this.getResults();
		var options = this.getOptions();

		var imgs = []
		for (var i in results) {
			imgs = imgs.concat(handleBenchmark(results[i].data, options[i].data, results[i].name));
		}

		var html = '<!DOCTYPE html><html><head><title>Benchmarks results</title></head><body>' +
					imgs.join('<br />') +
					'</body></html>'

		fs.writeFileSync('benchmarks/results.html', html);

		process.exit();
	});

	benchmark.run();
});

function handleBenchmark(results, options, name) {
	var result = [];

	var yAxis = {time:[]};
	var xAxis = [];

	for (var i in results) {
		yAxis.time.push(results[i].time);
	}

	for (var j in options) {
		for (var key in options[j]) {
			xAxis.push(options[j][key]);
			break;
		}
	}

	for (var key in yAxis) {

		
		result.push(
			'<img src="http://chart.googleapis.com/chart?' +
			'cht=s&' +
			'chs=600x300&' +
			'chxt=x,y&' +
			'chm=o,FF0000,0,,5|D,FF0000,0,,1|N,000000,0,-1,10,1.0,hvs&' +
			'chds=a&' +
			'chg=20,34,1,5&' +
			'chd=t:' + xAxis.join(',') + '|' + yAxis[key].join(',') + '&' +
			'chtt=' + name + ' (' + key + ')' + '" alt="' + name + '" />'
		);
	}

	console.log(result);

	return  result;
}