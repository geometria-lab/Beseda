var Monitor = {
    _interval : null,

    _servers : { },

    _serversNode : null,
    _serversTemplate : null,

    init : function() {
    /*
        $('#servers').delegate('a', 'click', function(event){
            event.preventDefault();
            var serverName = $(this).html();
            Monitor.selectServer(serverName);
        });
*/
        this._serversNode = $('#servers');
        this._serverTemplate = $('#serverTemplate');

        this.socketIO = new io.Socket();
        this.socketIO.on('message', function(message) {
            Monitor['_' + message.type + 'MessageHandler'](message);
        });
        this.socketIO.connect();

        this._updateDownTimestampInterval = setInterval(Monitor._updateDownTimestamp, 1000);
    },

    _serversMessageHandler : function(message) {
        this.log('Received servers message', message.servers);

        for (var i = 0; i < message.servers.length; i++) {
            var server = message.servers[i];

            // Convert timestamps to humandate
            var timestampFields = ['connectionTimestamp', 'declinedConnectionTimestamp',
                                   'subscriptionTimestamp', 'declinedSubscriptionTimestamp',
                                   'publicationTimestamp', 'declinedPublicationTimestamp'];
            for (var i = 0; i < timestampFields.length; i++) {
                server['_' + timestampFields[i]] = this._humanDate(server[timestampFields[i]]);
            }
            
            server._lastUpdate = this._timeAgo(server.lastUpdate);

            if (server.name in this._servers) {
                var copyFields = ['_lastUpdateNode' , '_encodedName', '_node'];
                for (var i = 0; i < copyFields.length; i++) {
                    server[copyFields[i]] = this._servers[server.name][copyFields[i]];
                }

                // Update fields on present server
                for (var field in server) {
                    if (server.hasOwnProperty(field)) {
                        $('.' + field, server._node).html(server[field]);
                    }
                }
            } else {
                server._encodedName = server.name.replace(/\W/g, '-');

                // Render template and add new server
                var serverRendered = Monitor._serverTemplate.tmpl(server);
                this._serversNode.append(serverRendered);

                server._node = $('#server-' + server._encodedName);
                server._lastUpdateNode = $('._lastUpdate', server._node);
            }

            server._lastUpdateNode.toggleClass('isDown', server.isDown);

            this._servers[server.name] = server;
        }
    },

    _updateDownTimestamp : function() {
        var now = +(new Date());

        for (var name in Monitor._servers) {
            var server = Monitor._servers[name];
            server._lastUpdate = Monitor._timeAgo(server.lastUpdate);
            server._lastUpdateNode.html(server._lastUpdate);
            if (!server.isDown && now > server.lastUpdate + (server.interval + 3) * 1000) {
                Monitor.log(name + ' not updated stats and marked as down');
                server.isDown = true;
                server._lastUpdateNode.addClass('isDown');
            }
        }
    },

    _channelsMessageHandler : function(message) {
        this.log('Received channels message', message);
    },

    log : function() {
        if ('console' in window && 'log' in console) {
            console.log.apply(console, arguments);
        }
    },

    _timeAgo : function(time) {
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
    },

    _humanDate : function(time) {
        if (!time) {
            return '';
        }

        var date = new Date(time);

        return date.getFullYear() + '/' + (date.getMonth() + 1) +
               '/' + date.getDate() + ', ' + date.getHours() + ':' +
               date.getMinutes() + ':' + date.getSeconds();
    }
}

$(document).ready(function() {
    Monitor.init();
});