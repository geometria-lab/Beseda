/*
 * hook-shim.js: A slimmed down minimal Hook.js class for the browser
 *
 * run './bin/browserify' to convert this script to a browser friendly format
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENCE
 *
 */


//
// TODO: Write better code comments for this file.
//

var dnode  = require('dnode'),
    path   = require('path'),
    EventEmitter = require('eventemitter2').EventEmitter2;

var Hook = exports.Hook = function (options) {
  
  self.reconnectionTimer = null;
  
  EventEmitter.call(this, { delimiter: '::', wildcard: true });
  
};

//
// Inherit from `EventEmitter2`.
//
inherits(Hook, EventEmitter);

Hook.prototype.connect = function () {

  var self = this;
  
  var client = dnode({
    
    message: function(event, data){
      //console.log(event, data);
      self.emit(event, data, false);
    },
    
    report: function(message) {
      //console.log('report ', message);
      //$('#server-name').html(message.toString());
    }
    
  });

  function connect() {
    client.connect(function (_remote, conn) {
      
        self.remote = _remote; 
        clearInterval(reconnectionTimer);
        conn.on('end', function(){
          //
          //  Attempt reconnection
          //
          reconnectionTimer = setInterval(function(){
            connect();
          }, 3000)
        });
        
        self.emit('browser::ready');
        
    });
  }

  connect();

};

Hook.prototype.start = function () {
  this.connect();
};

//
Hook.prototype.emit = function (event, data, broadcast) {

  if(typeof broadcast === "undefined") {
    broadcast = true;
  }

  if (event === 'newListener') {
    return EventEmitter.prototype.emit.apply(this, arguments);
  }

  //
  // Log all emitted events
  //
  //console.log(this.name, event, data);

  if (this.remote && broadcast) {
    this.remote.message(event, data);
  }

  return EventEmitter.prototype.emit.apply(this, arguments);
}



//
// Simple Inherits from node.js core
//
function inherits (ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};
