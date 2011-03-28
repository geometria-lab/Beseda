var Beseda = function(options) {
	this.setOptions({
		host : document.location.host
	}, options);

    this.isConnected = false;
    this.clientId = Beseda.uid(22, 64);


    var host = this.options.host
    delete this.options.host

    this.io = new io.Socket(host, options);
}
Beseda.prototype.subscribe = function(channel) {
	
}
Beseda.prototype.unsubscribe = function(channel) {
	
}
Beseda.prototype.publish = function(channel, message) {
	
}
Beseda.prototype.connect = function()
{
    this._isConnected = false;
}
Beseda.prototype.setOptions = function(options, extend) {
    this.options = this._mergeObjects(options, extend);
}}
Beseda.prototype._cloneObject = function(object) {
	return this._mergeObjects({}, object);
}

Beseda.prototype._mergeObjects = function(object, extend) {
	for (var p in extend) {
    	try {
        	if (extend[p].constructor == Object) {
            	object[p] = this._mergeObjects(object[p], extend[p]);
            } else {
                object[p] = extend[p];
            }
        } catch (e) {
            object[p] = extend[p];
        }
    }

	return object;
}

Beseda.uid = function() {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');
    var uid = [];

    for (var i = 0; i < 22; i++) {
        uid[i] = chars[0 | Math.random() * 64];
    }

    return uid.join('');
}


//adds a PushIt(options); function 
(function(global) {
	function PushIt(options) {
		var self = this;
		this.last_message_timestamp = 0; //get from server.
		this.messageCallbacks = {};
		this.agentId = this.UUID(22, 64);

		this.channels = [window.location.href];
		
		options.credentials || (options.credentials = "it is meeeee");
    
		if (options.channels) {
			this.channels = this.channels.concat(options.channels);
		}

		$(function() {
			self.initConnection(options);
		});
	};

	PushIt.prototype = {
		initConnection: function(options) {
			var self = this;

			var joinRequest = {
        data: { credentials: options.credentials },
				channel: "/meta/connect"
			};

      if(!options.hostname){
        alert("You must pass a hostname to initialize Push-It");
      }
      
      socket = new io.Socket(options.hostname);
      this.socket = socket;
      socket.connect();
      
      this.sendMessage(joinRequest);
      
      socket.addEvent('message', function(message){
        var chan = message.channel;
        switch(chan){
          case '/meta/succesful':
            self.messageCallbacks[message.uuid].onSuccess();
            break;
          case '/meta/error':
            self.messageCallbacks[message.uuid].onSuccess();
            break;
          default:
            console.log(message);
            self.onMessageReceived(message);
        }
      });
      
		},

		onMessageReceived: function(message) {
		  console.log("message: ", message);
			console.error("you must define an onMessageReceived callback!");
		},

    subscribe: function(channel, onError, onSuccess) {
			this.sendMessage({
			  "channel": "/meta/subscribe",
			  "data": {
			    "channel": channel
			  }
			});
    },
    
    unsubscribe: function(channel) {
			this.sendMessage({
			  "channel": "/meta/unsubscribe",
			  "data": {
			    "channel": channel
			  }
			});
    },
    
		publish: function(message, onError, onSuccess) {
      //For a little while, `data` and message were confused in this function,
      //  and i was requiring clients to send the body of the message in a 
      //    param named "message", but this was confusing because the rest of the system calls it "data"
      //  I am pretty sure that this is the result of a refactoring gone wrong =(
      //  Anyway, the three lines that follow this comment are there to allow older clients to "just work"
      //  while making it so that the error handling console statements are still correct.
			if(!message.hasOwnProperty("data") && message.hasOwnProperty("message")){
			  message.data = message.message;
			}
			
			if (!message.hasOwnProperty("channel") || !message.hasOwnProperty("data")) {
				console.log("error: the object sent to publish must have channel and data properties");
				return;
			}
			
			onError || (onError = function(){});
			onSuccess || (onSuccess = function(){});

      var sent = this.sendMessage({
        "data": message.message,
        "channel": message.channel
      }, onError, onSuccess);
		},
		
		sendMessage: function(obj, errorHandler, successHandler){
		  obj.uuid = this.UUID(22, 64);
		  obj.agentId = this.agentId;
		  if( errorHandler || successHandler){
		    this.messageCallbacks[obj.uuid] = {onError: errorHandler, onSuccess: successHandler};		    
		  }
		 
		  this.socket.send(obj);
		  return obj;
		},

    UUID: function(len, radix) {

    }
	};

	global.PushIt = PushIt;
})(this);
