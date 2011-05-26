var beseda = new Beseda();

beseda.on('connect', function(message) {
    Beseda.Utils.log('Beseda connected with clientId=' + message.clientId);
});

beseda.on('disconnect', function() {
    Beseda.Utils.log('Beseda disconnected');
});

beseda.on('subscribe', function(error, message) {
    if (!error) {
        Beseda.Utils.log('Beseda subscribed to ' + message.subscription.toString());
    }
});

beseda.on('unsubscribe', function(error, message) {
    if (!error) {
        Beseda.Utils.log('Beseda unsubscribed from ' + message.subscription.toString());
    }
});

beseda.on('publish', function(error, message) {
    if (!error) {
        Beseda.Utils.log('Beseda published message to ' + message.channel);
    }
})

beseda.on('error', function(error, message) {
    Beseda.Utils.log('Beseda error: ' + error);
});

beseda.on('message', function(channel, message, fullMessage) {
    $('#messages').prepend('<li><span class="channel">' + channel + '</span><span class="date">' + (new Date()).toString() + '</span><pre class="message">' + JSON.stringify(fullMessage) + '</pre></li>');
    Beseda.Utils.log('Beseda received message from ' +  channel);
});

$(document).delegate('#post', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#post .channel').val();
    var message = $('#post .message').val();
    $('#post .channel, #post .message').val('');

    if (channel.length && message.length) {
        beseda.publish(channel, message);
        Beseda.Utils.log('Beseda send publish request to ' + channel);
    }

    return false;
});

$(document).delegate('#subscribe', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#subscribe .channel').val();
    $('#subscribe .channel').val('');

    if (channel.length) {
        beseda.subscribe(channel, function(error) {
            if (!error) {
                $('#subscriptions').append('<li class="' + channel.replace('/', '_____') + '">' + channel + '</li>');
            }
        });
        Beseda.Utils.log('Beseda send subscribe request to ' + channel);
    }

    return false;
});

$(document).delegate('#unsubscribe', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#unsubscribe .channel').val();
    $('#unsubscribe .channel').val('');

    if (channel.length) {
        beseda.unsubscribe(channel, function(error) {
            if (!error) {
                $('#subscriptions .' + channel.replace('/', '_____')).remove();
            }
        });

        Beseda.Utils.log('Beseda send unsubscribe request to ' + channel);
    }

    return false;
});