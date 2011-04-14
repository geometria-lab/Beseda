Beseda
============

Beseda is fast, well designed and featured [Node.js](http://nodejs.org) Pub/Sub server based on patched [Socket.io](http://socket.io).
Beseda offers server-side and client-side crossbrowser API for realtime messaging.

Features
---

* [Bayeux](http://svn.cometd.com/trunk/bayeux/bayeux.html) messaging protocol
* Customizable Pub/Sub engine:
    * Memory
    * [Redis](http://redis.io)
    * You own
* Security:
    * SSL
    * Connection
    * Publishing
    * Subscribing
* Horizontal scaling (depends on Pub/Sub engine)
* Monitor
* Server-side clients:
    * PHP
    * Ruby (coming soon)
    * Node.js (coming soon)
    * Python (coming soon)
* Browsers client. Works well:
    * Safari 4
    * Safari 5
    * Google Chrome 5
    * Internet Explorer 6
    * Internet Explorer 7
    * Internet Explorer 8
    * Internet Explorer 9
    * iPhone Safari
    * iPad Safari
    * Firefox 3
    * Firefox 4
    * Opera 10
    * Opera 11

Get started!
---

1. **Install Node.js**

    Read [Building and Installing Node.js](https://github.com/joyent/node/wiki/Installation) in wiki.

2. **Get Beseda**

    You can install Beseda from npm or get from git repository.

    2.1. **Install from npm**

    `npm install beseda`

    2.2. **Get last unstable version from git**

    `git clone http://github.com/geometria-lab/Beseda.git`

    `npm install Beseda`

3. **Use Beseda**

    _NOTE: You can find test application in `example` folder._

    3.1. Create you server.js

         var Beseda = require('beseda'),
             beseda = new Beseda();

         beseda.listen(3000);

    3.2. Run by Node.js

    `sudo node server.js`

    3.3. Create you test.html

        <script src="http://localhost:3000/socket.io/socket.io.js" type="text/javascript"></script>
        <script src="http://localhost:3000/beseda.min.js" type="text/javascript"></script>
        <script src="http://localhost:3000/beseda.min.js" type="text/javascript"></script>
        <script type="text/javascript">

        function say(what) {
            if ('console' in window && 'log' in console) {
                console.log(what);
            } else {
                alert(what);
            }
        }

        var beseda = new Beseda({ host : 'localhost', port : 3000 });

        beseda.subscribe('/myFavoriteChannel', function(error) {
            say('You are subscribed to "/myFavoriteChannel".');
        });

        beseda.on('message', function(channel, message) {
            say(channel + ': "' + message + '"');
        });

        </script>
        <input type="button" value="Send me a nice message dude..." onclick="beseda.publish('/myFavoriteChannel', 'Nice!');return false"/>

    3.4 Test it

    Open test.html in you favorite browser and open console (firebug, javascript console...)

Documentation
---

### Server configuration

Coming soon.

### Browser client

Coming soon.

### PHP client

Coming soon.

### Monitor

Coming soon.

Contributors
---

* [Ivan Shumkov](mailto:ivan@shumkov.ru)
* [Sergey Kononenko](mailto:kononencheg@gmail.com)

Inspired
---
* [Push-it](https://github.com/aaronblohowiak/Push-It)
* [Juggernaut](https://github.com/maccman/juggernaut)

License
---

(The BSD license)

Copyright (c) 2011, Geometria Lab <ufo@geometria-lab.net>

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright
  notice, this list of conditions and the following disclaimer in the
  documentation and/or other materials provided with the distribution.
* Neither the name of the "organization" nor the
  names of its contributors may be used to endorse or promote products
  derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL "COPYRIGHT HOLDER" BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.