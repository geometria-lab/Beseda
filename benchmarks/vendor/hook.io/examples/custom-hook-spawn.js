/*
 * Custom Hook-io Spawn
 */

var Helloworld = require('hook.io-helloworld').Helloworld;


var myHello = new Helloworld({name:"a"});

myHello.on('hook::ready', function(){

  myHello.spawn([
     {
       type: 'helloworld',
       name: 'b',
       foo: "bar"
     },
     {
       type: 'helloworld',
       name: 'c',
       beep: "boop"
     },
     {
       type: 'helloworld',
       name: 'd'
     }
   ]);

});

myHello.start();