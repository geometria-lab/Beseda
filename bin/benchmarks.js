#!/usr/bin/env node

var cli  = require('cli');
var util = require('util');
var fs = require('fs');
var Benchmark = require('../benchmarks/lib/benchmark.js');

cli.parse({
    config  : [ 'c',   'Benchmarks config file', 'string' ],
    results : [ 'r',   'Save results to HTML file', 'string' ]
});

cli.setUsage('benchmarks [OPTIONS]');

cli.main(function(args, option) {
	if (!option.config) {
		cli.getUsage();
		process.exit(1);
	}

	var config = JSON.parse(fs.readFileSync(option.config, 'utf8'));

	var benchmark = new Benchmark(config);
	benchmark.on('finish', function() {
		if (option.results) {
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

			console.log('Results saved to ' + option.results);
		}
		process.exit();
	});

	benchmark.run();
});

function handleBenchmark(results, options, name) {
	var result = ['<h2>' + name + '</h2>'];

	var yAxis = { time:[], missing: [] };
	var xAxis = [];
	var publishers = [];

	for (var i in results) {
		yAxis.time.push(results[i].time);
		yAxis.missing.push(results[i].lost);
		publishers.push(options[i].publish);
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
			'chxt=x,y,x&' +
			'chm=o,FF0000,0,0:' + (xAxis.length-1) + ',5|o,0000FF,0,' + xAxis.length + ':' +  (xAxis.length*2-1) +  ',5|' +
				'D,FF0000,0,0:' + (xAxis.length-1) + ',1|D,0000FF,0,' + xAxis.length + ':' +  (xAxis.length*2-1) +  ',1|' +
				'N,000000,0,-1,10,1.0,hvs&' +
			'chds=a&' +
			'chg=20,34,1,5&' +
			'chd=t:' + xAxis.join(',') + ',' + xAxis.join(',') + '|' +
					   yAxis[key].join(',') + ',' + publishers.join(',') + '&' +
			'chco=FF0000|FF0000|FF0000|FF0000|FF0000|FF0000&chdl=' + key + '|publish&' +
			'chtt=' + name + ' (' + key + ')' + '" alt="' + name + '" />'
		);
	}

	return  result;
}