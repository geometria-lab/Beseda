#!/usr/bin/env node

var cli  = require('cli');
var util = require('util');
var fs = require('fs');
var Benchmark = require('../benchmarks/lib/benchmark.js');

cli.parse({
    config  : [ 'c',   'Config', 'string' ],
    results : [ 'r',   'Results', 'string' ]
}, {});

cli.main(function(args, option) {
	var config = JSON.parse(fs.readFileSync(option.config, 'utf8'));

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

		fs.writeFileSync(option.results, html);

		process.exit();
	});

	benchmark.run();
});

function handleBenchmark(results, options, name) {
	var result = ['<h2>' + name + '</h2>'];

	var yAxis = { time:[], missing: [] };
	var xAxis = [];

	for (var i in results) {
		yAxis.time.push(results[i].time);
		yAxis.missing.push(results[i].lost);
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