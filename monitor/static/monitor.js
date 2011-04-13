var Monitor = {
    _interval : null,

    _servers : null,
    _serversTemplate : null,

    init : function() {
        $('#servers').delegate('a', 'click', function(event){
            event.preventDefault();
            var serverName = $(this).html();
            Monitor.selectServer(serverName);
        });

        this._server = $('#server');
        this._serverTemplate = $('#serverTemplate');

		this.socketIO = new io.Socket();
		this.socketIO.on('message', Monitor._onMessage); function(message) {
			Monitor['_' + message.type + 'MessageHandler'](message);
		});
		this.socketIO.connect();
    },

	_serversMessageHandler : function(message) {
		Monitor.log('Received servers message', message.servers);

        var start = new Date();

		for (var i = 0; i < message.servers.length; i++) {
			var serverNode = $('.server-' + message.servers[i].name, Monitor._servers);
			
			var serverRendered = Monitor._serverTemplate.tmpl(message.servers[i]);
			
			if (serverNode.get(0)) {
				serverNode.
			} else {
				
			}
		}

        Monitor._servers.html(
            
        );

        var end = new Date(),
            elapsed = end.getTime() - start.getTime();

        Monitor.log('Stats rendered in', elapsed);
	},
	
	_channelsMessageHandler : function(message) {
		
	},

    log : function() {
        if ('console' in window && 'log' in console) {
            console.log.apply(console, arguments);
        }
    },

    timeAgo : function(time) {
        var date = new Date(time),
            diff = (((new Date()).getTime() - date.getTime()) / 1000),
            day_diff = Math.floor(diff / 86400);

	        if (isNaN(day_diff) || day_diff < 0) return;

	        return day_diff == 0 && (diff < 60 && Math.floor(diff) + " seconds ago" ||
                                     diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
                                     diff < 7200 && "1 hour ago" ||
                                     diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
                   day_diff == 1 && "Yesterday" ||
                   day_diff < 7 && day_diff + " days ago" ||
                   Math.ceil( day_diff / 7 ) + " weeks ago";
    }
}

$(document).ready(function() {
    Monitor.init();
});