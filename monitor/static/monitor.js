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

        this._servers = $('#servers');
        this._serversTemplate = $('#serversTemplate');

        this.startUpdate();
    },

    startUpdate : function() {
        if (!this._interval) {
            this.update();
            this._interval = setInterval(Monitor.update, 10000);
        }
    },

    stopUpdate : function() {
        clearInterval(this._interval);
        this._interval = null;
    },

    update : function() {
        $.getJSON('/stats', function(stats) {
            Monitor.log('Received stats', stats);

            var start = new Date();

            Monitor._servers.html(
                Monitor._serversTemplate.tmpl({ servers : stats })
            );

            var end = new Date(),
                elapsed = end.getTime() - start.getTime();

            Monitor.log('Stats rendered in', elapsed);
        });
    },

    selectServer : function(name) {
        this.log('Name')
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