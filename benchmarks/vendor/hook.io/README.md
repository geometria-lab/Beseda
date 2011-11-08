     __    __    ______     ______    __  ___         __    ______   
    |  |  |  |  /  __  \   /  __  \  |  |/  /        |  |  /  __  \  
    |  |__|  | |  |  |  | |  |  |  | |  '  /         |  | |  |  |  | 
    |   __   | |  |  |  | |  |  |  | |    <          |  | |  |  |  | 
    |  |  |  | |  `--'  | |  `--'  | |  .  \    __   |  | |  `--'  | 
    |__|  |__|  \______/   \______/  |__|\__\  (__)  |__|  \______/  

    a full featured i/o framework for node.js
    
# v0.6.0

## hook.io creates a distributed node.js EventEmitter that works cross-process / cross-platform / cross-browser. Think of it like a real-time event bus that works anywhere JavaScript is supported.

## You create custom i/o scenarios by picking and choosing from an extensive library of tiny, independent, autonomous "hooks" that seamlessly work together.

### Email List: [http://groups.google.com/group/hookio][0]

# Features :

- Build large, decoupled, distributed, and fault tolerant I/O heavy applications in node.js
- Create hooks on ANY device that supports JavaScript (cross-browser support via [socket.io][1])
- Throw any block of sync or async code on a new process with a callback
- Easily scale any tcp based messaging infrastructure (such as clustering socket.io chat rooms in memory) 
- Interprocess Message Publishing and Subscribing done through [EventEmitter2][2] and [dnode][3]
- Messaging API inherits and mimics Node's native EventEmitter API (with the help of EventEmitter2)
- Spawning and Daemonizing of processes handled with [Forever][4]
- Easily connect / disconnect hooks "hot" without affecting other services
- Core library currently checking in at about ~450 lines of code

# Available Hooks (more coming soon)

- [cron](http://github.com/hookio/cron): Execute Hook Events as Tasks
- [irc](http://github.com/hookio/irc): Full IRC bindings
- [helloworld](http://github.com/hookio/helloworld)
- [logger](http://github.com/hookio/logger): Multi-transport Logger (Console, File, Redis, Mongo, Loggly)
- [mailer](http://github.com/hookio/mailer): Sends emails
- [sitemonitor](http://github.com/hookio/sitemonitor): A low level Hook for monitoring web-sites.
- [request](http://github.com/hookio/request): Simple wrapper for [http://github.com/mikeal/request](http://github.com/mikeal/request)
- [repl](http://github.com/hookio/repl): Rainbow Powered REPL
- [twilio](http://github.com/hookio/twilio): Make calls and send SMS through [Twilio][5]
- [twitter](http://github.com/hookio/twitter): Wrapper to Twitter API
- [webhook](http://github.com/hookio/webhook): Emits received HTTP requests as Events (with optional JSON-RPC 1.0 Support)

# Getting Start / Demo

     npm install hook.io-helloworld -g

Now run:

     hookio-helloworld
     
Spawn up as many as you want. The first one becomes a server, the rest will become clients. Each helloworld hook emits a hello on an interval. Now watch the i/o party go!     


# Blog Posts

Distribute Node.js Apps with Hook.io: [http://blog.nodejitsu.com/distribute-nodejs-apps-with-hookio][6]

## Tests

All tests are written with [vows][7] and require that you link hook.io to itself:

``` bash
  $ cd /path/to/hook.io
  $ [sudo] npm link
  $ sudo bin/test --spec 
```

## Core Hook.io Team

Marak Squires, Charlie Robbins, Jameson Lee

## Contributors (through code and advice)
Substack, h1jinx, AvianFlu, Chapel, Dominic Tarr, Tim Smart, tmpvar, kadir pekel, perezd

[0]: http://groups.google.com/group/hookio
[1]: http://socket.io
[2]: https://github.com/hij1nx/EventEmitter2
[3]: http://github.com/SubStack/dnode
[4]: https://github.com/indexzero/forever
[5]: http://www.twilio.com/
[6]: http://blog.nodejitsu.com/distribute-nodejs-apps-with-hookio