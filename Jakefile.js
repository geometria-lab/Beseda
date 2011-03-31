var fs = require('fs');

function readJsFiles() {
    var javascript = '';
    ['client', 'events', 'router', 'utils'].forEach(function(file){
        javascript += fs.readFileSync('./client/js/lib/' + file + '.js') + "\n\n";
    });

    return javascript;
}

desc('Show tasks');
task('default', [], function(params) {
    var exec = require('child_process').exec;
    exec('jake -T', function(error, stdout, stderr) {
        console.log(stdout);
    })
});

desc('Glue and compress javascript client');
task('glueJs', [], function(params) {
    var javascript = readJsFiles();

    fs.writeFile('./client/js/beseda.js', javascript);

    console.log('beseda.js created.');
});


desc('Glue and compress javascript client');
task('compressJs', [], function(params) {
    var mjs = require('./vendor/minifyjs');

    var javascript = readJsFiles();

    console.log('Start compress beseda.js.');

    var ast = mjs.minify(javascript, function(error, code) {
        if (error) {
            console.log(error);
        } else {
            console.log('');
            console.log('Compression level ' + (0 | ((code.length / javascript.length) * 100)) + '%.');
            fs.writeFile('./client/js/beseda.min.js', code);
            console.log('');
            console.log('beseda.min.js created.');
        }
    });
});