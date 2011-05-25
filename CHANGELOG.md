Changelog
======

Version 0.0.5
---
Unreleased

* JS client: cleanup logs and add error message to error callback as first argument
* Fix PHP publisher
* Session must known subscribed channels for fast destroy
* Cleanup empty channels
* Use own router for serve static in example
* Connection ID and Message ID must be a unique hash
* Refactor Session and Channel: needs SubscriptionManager

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