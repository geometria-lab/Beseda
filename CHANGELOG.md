Changelog
======

Version 0.0.10
---
July 28, 2011

* Fix redis options

Version 0.0.9
---
July 20, 2011

* Fix listen
* Return from dispatch if invalid message format
* http.Server.address() sometimes throws exception

Version 0.0.8
---
June 3, 2011

* Fix some crazy transpots bugs
* Fix reconnect options bug

Version 0.0.7
---
June 2, 2011

* Refactor browser client
* Compress browser client by Google Closure Compiler
* Fix long polling transport validation

Version 0.0.6
---
June 2, 2011

* Publisher for Server
* Polling loop interval

Version 0.0.5
---
May 26, 2011

* Websocket transport
* JS client: cleanup logs and add error message to error callback as first argument
* Fix PHP publisher
* Session must known subscribed channels for fast destroy
* Cleanup empty channels
* Use own router for serve static in example
* Connection ID and Message ID must be a unique hash
* Refactor Session and Channel: needs SubscriptionManager
* Refactor client's transports
* Fix reconnect bugs

Version 0.0.4
---
May 23, 2011

* Socket.IO goodbye! Own much faster and stable IO mechanism.
  Long polling and JSONP long polling transports implemented. WebSocket and FlashSocket soon!
* Add params to router
* Refactor server and client
* Node.js Beseda client
* Command line client and server
* Add reconnect and disconnect on server
* Restore subscribes if server is down
* JSONify protocol
* Remove requests timeouts
* Longpolling to CRUD
* Disconnection request
* Fixed memory leaks
* Lot of optimization
* Router parameters

Version 0.0.3
---
May 15, 2011

* Disable monitor (not stable)
* Change default port to 4000 for server and to 4001 for monitor

Version 0.0.2
---
April 13, 2011

* Monitor
* Some fixes and refactors
* PHP publisher

Version 0.0.1
---
April 4, 2011

* Server
* Browser client
