/*
 * hook.js: Core hook object responsible for managing dnode-based IPC.
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENCE
 *
 */
 
var async  = require('async'),
    dnode  = require('dnode'),
    util   = require('util'),
    colors = require('colors'),
    nconf  = require('nconf'),
    path   = require('path'),
    EventEmitter = require('eventemitter2').EventEmitter2,
    hookio = require('../hookio'),
    argv   = hookio.cli.argv;

var reserved = ['hook', 'connection', 'children', 'error', 'client'],
    DELIMITER = '::';

//
// ### function Hook (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Hook object responsible for managing
// dnode based IPC.
//
var Hook = exports.Hook = function (options) {
  var self = this;

  //
  // TODO: We should make events Arrays and there should be options
  // which can be passed to the `EventEmitter2` constructor function. 
  //
  EventEmitter.call(this, { delimiter: DELIMITER, wildcard: true });
  options = options || {};

  Object.keys(options).forEach(function (o) {
    self[o] = options[o];
  });

  //
  // Setup some intelligent defaults.
  //
  this.id        = 0;
  this._names    = {};
  this.defaults  = {};
  this.children  = {};
  this.listening = false;
  this.connected = false;

  //
  // The covention of self.foo = self.foo || options.foo,
  // is being used so other classes can extend the Hook class
  //
  this.name = this.name || options.name || argv['hook-name'];
  this.type = this.type || options.type || argv['hook-type'] || this.name || 'no-hook';

  //
  // All servers and clients will listen and connect port 5000 by default
  //
  this.debug = options.debug === true || argv.debug === true;
  this.defaults['hook-port']   = options['hook-port']   || argv['hook-port']   || 5000;
  this.defaults['hook-host']   = options['hook-host']   || argv['hook-host']   || 'localhost';
  this.defaults['hook-socket'] = options['hook-socket'] || argv['hook-socket'] || null;

  // 
  // Each hook get's their own config.json file managed
  // by an instance of the `nconf.Provider`.
  //
  // Remark: This configuration path needs to load from a 
  // default configuration file and then write to a custom 
  // configuration file based on the hook `type/name` combo. 
  //

  this.config = new nconf.Provider();
  this.config.use('file', { file: './config.json' });
  this.config.load();

};

//
// Inherit from `EventEmitter2`.
//
util.inherits(Hook, EventEmitter);

//
// ### function emit (event, data, local)
// #### @event {string} Event name to emit / broadcast
// #### @data {**} Data to associate with the event
// #### @broadcast {boolean} Value indicating if this event is local (i.e. should not be broadcast)
// Calls of the listeners on `event` for this instance and also broadcasts
// it to the parent (i.e. `this.remote`) if it exists and `local` is not set.  
//
// TODO: Support more than one data argument in `.emit()`
//
Hook.prototype.emit = function (event, data, broadcast) {
  if (event === 'newListener') {
    return EventEmitter.prototype.emit.apply(this, arguments);
  }

  var parts = event.split(DELIMITER);

  //
  // Log all emitted events
  //
  this.log(this.name, event, data);

  if (broadcast !== true && this.remote && reserved.indexOf(parts[0]) === -1) {
    //
    // If this call to emit has not been forced local, this instance has a 
    // remote (i.e. parent) connection and it is not a reserved event
    // (i.e. local-only: 'hook::*', 'connection::*' or 'children::*') 
    // the broadcast it back to the parent
    //
    this.remote.message(this.name + DELIMITER + event, data);
  }

  return EventEmitter.prototype.emit.apply(this, arguments);
}

//
// ### function start (options, callback) 
// #### @options {Object} Options to use when starting this hook.
// #### @callback {function} Continuation to respond to when complete
// Attempts to spawn the hook server for this instance. If a server already
// exists for those `options` then attempt to connect to that server.
//
Hook.prototype.start = function (options, callback) {  
  var self = this;

  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  //
  // Remark: (indexzero) `.start()` should do more lookup
  // table auto-discovery before calling `.listen()` but
  // that's a work in progress
  //
  this.listen(options, function (err) {
    if (err) {
      if (err.code == 'EADDRINUSE') {
        self.emit('error::bind', self['hook-port']);
        return self.connect(options, callback);
      }
      self.emit('error::unknown', err);
    }

    if (callback) {
      callback.apply(null, arguments);
    }
  });
};

//
// ### function listen (options, callback) 
// #### @options {Object} Options to use when listening for this hook server.
// #### @callback {function} Continuation to respond to when complete
// Attempts to spawn the hook server for this instance. 
//
Hook.prototype.listen = function (options, callback) { 
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  options = options || {};
  
  this.listening    = true;
  this['hook-port'] = options['hook-port'] || this.defaults['hook-port'];
  this['hook-host'] = options['hook-host'] || this.defaults['hook-host'];
  
  if (options.server) {
    this['hook-port'] = options.server;
  }
  
  var self = this;
  
  this.server = dnode(function (client, conn) {
    this.report = function (name, reported) {
      //
      // ### function checkName (name, type, id)
      // #### @name {String} Name of hook to check
      // Recurisively checks hook's name until it
      // finds an available name for hook.
      //
      function checkName (name, id) {

        var _name;

        if (typeof id !== 'undefined') {
          _name = name + '-' + id;
          id++;
        } else {
          id = 0;
          _name = name;
        }

        if (Object.keys(self._names).indexOf(_name) === -1 && self.name !== _name) {
          self._names[_name] = {};
          return _name;
        } 

        return checkName(name, id);
      }
      
      //
      // Update the name on the client accordingly
      //
      client.name = checkName(name);
      self.emit('client::connected', client.name);
      reported(client.name);
    };

    this.message = function (event, data) {
      self.emit(event, data, true);
    };

    //
    // On incoming events to the server,
    // send those events as messages to all clients
    //
    self.onAny(function (data, remote) {
      var parts = this.event.split(DELIMITER),
          event = !remote ? [self.name, this.event].join(DELIMITER) : this.event;
                
      //
      // Only broadcast if the client has a message function, it is not a reserved 
      // (i.e. local-only: 'hook::*', 'connection::*' or 'children::*') and 
      // the event was not broadcast by the client itself (e.g. no circular transmissions)
      //
      if (client.message && reserved.indexOf(parts[0]) === -1 && parts[0] !== client.name) {
        client.message(event, data);
      }
    });
  });
  
  this.server.on('connection', function (conn) {
    self.emit('connection::open', conn);
  });

  this.server.on('ready', function () {
    self.emit('hook::listening', self['hook-port']);
    self.emit('hook::ready', self['hook-port']);
    
    if (callback) {
      callback();
    }
  });

  //
  // Remark: Hook discovery could be improved, but needs the semantic
  // and cardinality to be better defined.
  //
  try {
    this.server.listen(self['hook-port']);
  }
  catch (ex) {
    if (callback) {
      return callback(ex);
    }
    
    self.emit('error', ex);
  }
};

//
// ### function connect (options, callback) 
// #### @options {Object} Options to use when starting this hook.
// #### @callback {function} Continuation to respond to when complete
// Attempt to connect to a hook server using the specified `options`.
//
Hook.prototype.connect = function (options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  options = options || {};

  this['hook-port'] = this['hook-port'] || options['hook-port'] || this.defaults['hook-port'];
  this['hook-host'] = this['hook-host'] || options['hook-host'] || this.defaults['hook-host'];

  var self = this, 
      client;

  client = dnode({
    message: function (event, data) {
      self.emit(event, data, true);
    }
  });

  //
  // Remark: Create dnode connection options based 
  // on (this) Hook configuration
  //
  var dnodeOptions = this._dnodeOptions();

  client.connect(dnodeOptions, function (remote, conn) {
    self.conn      = conn;
    self.remote    = remote;
    self.connected = true;

    conn.on('end', function () {
      self.emit('connection::end');
    });

	conn.on('error', function() {
		console.log(arguments);
	})

    remote.report(self.name, function (newName, newID) {
      self.name = newName;
      self.id   = newID;

      self.emit('hook::connected', self['hook-port']);
      self.emit('hook::ready', self['hook-port']);
      
      if (callback) {
        callback();
      }
    });
  });
};

//
// ### function spawn (hooks, callback)
// #### @hooks {string|Array|Object} Hook types to spawn as children to this instance
// #### @callback {function} Continuation to respond to when complete
// Spawns the specified `hooks` as children to the current `Hook` instance.
//
Hook.prototype.spawn = function (hooks, callback) {
  var self = this,
      connections = 0,
      local,
      names;
  
  function onError (err) {
    self.emit('error::spawn', err);
    if (callback) {
      callback(err);
    }
  }
  
  if (!this.listening) {
    return onError(new Error('Cannot spawn child hooks without calling `.listen()`'));
  }  

  if(typeof hooks === "string") {
    hooks = new Array(hooks);
  }

  types = {};
  
  if (typeof hookio.forever === 'undefined') {
    //
    // Attempt to `require('forever')` and if it is available
    // then spawn all 
    //
	try {
		hookio.forever = require('../../../forever/lib/forever.js');
    }
    catch (ex) {
      //
      // Remark: Should we be warning the user here?
      //
      hookio.forever = ex;
    }
  }
  
  //
  // Spawn in-process (i.e. locally) if `hookio.forever` has been set
  // purposefully to `false` or if it is an instance of an `Error` 
  // (i.e. it had previously failed to be required). 
  //
  local = self.local || !hookio.forever || hookio.forever instanceof Error;

  function spawnHook (hook, next) {
    var hookModule,
        hookBin = __dirname + '/../../bin/forever-shim',
        options,
        child,
        keys;

    if(typeof hook === 'string') {
      hook = {
        name: hook,
        type: hook
      };
    }

    hook['host'] = hook['host'] || self['hook-host'];
    hook['port'] = hook['port'] || self['hook-port'];

    hookModule = hook.type;

    self.emit('hook::spawning', hook.name);

    if (local) {
      //
      // Create empty object in memory and dynamically require hook module from npm
      //
      self.children[hook.name] = {
        module: require(hookModule)
      };

      //
      // Here we assume that the `module.exports` of any given `hook.io-*` module
      // has **exactly** one key. We extract this Hook prototype and instantiate it.
      //
      keys = Object.keys(self.children[hook.name].module);
      self.children[hook.name].Hook  = self.children[hook.name].module[keys[0]];
      self.children[hook.name]._hook = new (self.children[hook.name].Hook)(hook);

      //
      // When the hook has fired the `hook::ready` event then continue.
      //
      self.children[hook.name]._hook.once('hook::ready', next.bind(null, null));
      self.children[hook.name]._hook.connect(self);
    }
    else {

      try { require.resolve(hookModule); }
      catch (ex) { return next(ex) }

      //
      // TODO: Make `max` and `silent` configurable through the `hook.config`
      // or another global config.
      //
      options = {
        max: 10,
        silent: false,
        logFile: path.join('./forever-' + hook.type + '-' + hook.name)
      };

      options.options = self._cliOptions(hook);

      child = new (hookio.forever.Monitor)(hookBin, options);
      child.on('start', function onStart (_, data) {
        //
        // Bind the child into the children and move on to the next hook
        //
        self.children[hook.name] = {
          bin: hookBin,
          monitor: child
        };

		self.emit('child::start', hook.name, self.children[hook.name]);

	    next();
      });
      
      child.on('restart', function () {
        self.emit('child::restart', hook.name, self.children[hook.name]);
      });
      
      child.on('exit', function (err) {
        //
        // Remark: This is not necessarily a bad thing. Hooks are not by definition
        // long lived processes (i.e. worker-hooks, tbd).
        //
        self.emit('child::exit', hook.name, self.children[hook.name]);
      });

      child.start(); 
    }
  }
  
  self.on('client::connected', function onConnect (data) {
    connections++;
    if (connections === hooks.length) {
      self.emit('children::ready', hooks);
      self.off('client::connected', onConnect);
    }
  });
  
  async.forEach(hooks, spawnHook, function (err) {
    if (err) {
      return onError(err);
    }

    self.emit('children::spawned', hooks);
    if (callback) {
      callback();
    }
  });
  
  return this;
};

Hook.prototype.log = function (hook, event, data) {
  hook  = hook  || 'no name specified';
  data  = data  || 'null';
  event = event || 'no event specified';

  //
  // TODO: Add the ability to filter what gets logged,
  //       based on the event namepace
  //
  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }

  data = data.toString();

  if (this.debug) {
    var truncatedData = data.length > 50
      ? data.substr(0, 50) + ' ... '
      : truncatedData = data;

    console.log(pad(hook, 30).magenta, pad(event, 25).green, truncatedData.grey);
  }
};

//
// ### @private function _cliOptions (options)
// #### @options {Object} Object to serialize into command-line arguments.
// Serializes the specified `options` into a space delimited, double-dash `--`
// set of command-line arguments.
//
//    {
//      host: 'localhost',
//      port: 5010,
//      name: 'some-hook-name',
//      type: 'type-of-hook',
//      beep: 'boop'
//    }
//
//    --hook-host localhost --hook-port 5010 --hook-name some-hook-name --hook-type type-of-hook --beep boop
//
Hook.prototype._cliOptions = function (options) {
  var cli = [];
  
  //
  // TODO: Refactor 'reserved_cli' and module scopeds 'reserved' into Protoype variable with nested namespaces
  //
  var reserved_cli = ['port', 'host', 'name', 'type'];

  Object.keys(options).forEach(function (key) {
    //
    // TODO: Some type inspection to ensure that only
    // literal values are accepted here.
    //
    if(reserved_cli.indexOf(key) === -1) {
      cli.push('--' + key, options[key]);
    } else {
      cli.push('--hook-' + key, options[key]);
    }
  });

  return cli;
};

//
// ### @private function _dnodeOptions ()
// Returns an Object literal for this instance to be passed
// to various dnode methods
//
Hook.prototype._dnodeOptions = function () {
  return {
    port:        this['hook-port'],
    path:        this.socket,
    key:         this.key,
    block:       this.block,
    reconnect:   this.reconnect
  };
};

function pad (str, len) {
  var s;
  s = str;
  if (str.length < len) {
    for (var i = 0; i < (len - str.length); i++) {
      s += ' '
    }
  }
  return s;
}
