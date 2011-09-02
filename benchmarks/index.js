//var fs = require('fs');
//var options = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

var Benchmark = require('./lib/benchmark.js');
var StepWrapper = require('./step_wrapper.js');

var benchmark = new Benchmark();
benchmark.on('finish', function(){
	console.log('Global finish');
	process.exit();
});

benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));
benchmark.addChild(new StepWrapper({ subscribers: 10 }));

benchmark.run();

var transport = new Benchmark();
