var fs            = require('fs'),
    optionsString = fs.readFileSync(__dirname + '/config.json', 'utf8'),
    options       = JSON.parse(optionsString);

var Benchmark = require('./lib/benchmark.js');

var benchmark = new Benchmark('test', options);
benchmark.run();