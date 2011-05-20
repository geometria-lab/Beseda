#!/usr/bin/env node

var cli  = require('cli'),
    util = require('util');

var Beseda = require('./../server');

cli.parse({
    host : [ 'h',   'Host', 'ip', '127.0.0.1' ],
    port : [ 'p',   'Port', 'number', 4000 ],
    ssl  : [ false, 'SSL',  'boolean', false ],

    pubSub  : [ false, 'Pub/Sub engine', 'string',  'memory' ],
    monitor : [ 'm',   'Enable monitor', 'boolean', 0 ],

    debug : ['d', 'Display debug information', 'boolean', false]
});

cli.main(function(args, options) {
    options.server = {
        host : options.host,
        port : options.port,
        ssl  : options.ssl
    }

    var beseda = new Beseda(options);
    beseda.listen();
});
// TODO: Run beseda as daemon
/*
        var daemon = require("daemon"),
	fs = require("fs"),
	sys = require("sys"),
	http = require("http"),
	file = "/home/user/dae.pid",//Храним PID
	f = fs.readFileSync(file),
	pid,
	args = process.argv;
switch (args[2]) {
        case "stop":
            process.kill(parseInt(fs.readFileSync(file)));//Считываем PID демона и убиваем процесс
            sys.puts("Daemon stopped");
            process.exit(0);
            break;
        case "start":
            pid = daemon.start(f);//Запуск демона
            daemon.lock(file);//Блокируем файл
            sys.puts("Daemon started with PID "+pid);
            break;
        default:
            sys.puts("Usage: [start|stop]");
            process.exit(0);
}
//Запускаем сервер
http.createServer(function(req,res){
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end("hello world");

}).listen(3000,'127.0.0.1');*/