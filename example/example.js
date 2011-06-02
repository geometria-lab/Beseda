var connection = new Beseda();

connection.on('connect', function(message) {
    beseda.utils.log('Beseda connected with clientId=' + message.clientId);
});

connection.on('disconnect', function() {
    beseda.utils.log('Beseda disconnected');
});

connection.on('subscribe', function(error, message) {
    if (!error) {
        beseda.utils.log('Beseda subscribed to ' + message.subscription.toString());
    }
});

connection.on('unsubscribe', function(error, message) {
    if (!error) {
        beseda.utils.log('Beseda unsubscribed from ' + message.subscription.toString());
    }
});

connection.on('publish', function(error, message) {
    if (!error) {
        beseda.utils.log('Beseda published message to ' + message.channel);
    }
})

connection.on('error', function(error, message) {
    beseda.utils.log('Beseda error: ' + error);
});

connection.on('message', function(channel, message, fullMessage) {
    $('#messages').prepend('<li><span class="channel">' + channel + '</span><span class="date">' + (new Date()).toString() + '</span><pre class="message">' + JSON.stringify(fullMessage) + '</pre></li>');
    beseda.utils.log('Beseda received message from ' +  channel);
});

$(document).delegate('#post', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#post .channel').val();
    var message = $('#post .message').val();
    $('#post .channel, #post .message').val('');

    if (channel.length && message.length) {
        connection.publish(channel, message);
        beseda.utils.log('Beseda send publish request to ' + channel);
    }

    return false;
});

$(document).delegate('#subscribe', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#subscribe .channel').val();
    $('#subscribe .channel').val('');

    if (channel.length) {
        connection.subscribe(channel, function(error) {
            if (!error) {
                $('#subscriptions').append('<li class="' + channel.replace('/', '_____') + '">' + channel + '</li>');
            }
        });
        beseda.utils.log('Beseda send subscribe request to ' + channel);
    }

    return false;
});

$(document).delegate('#unsubscribe', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#unsubscribe .channel').val();
    $('#unsubscribe .channel').val('');

    if (channel.length) {
        connection.unsubscribe(channel, function(error) {
            if (!error) {
                $('#subscriptions .' + channel.replace('/', '_____')).remove();
            }
        });

        beseda.utils.log('Beseda send unsubscribe request to ' + channel);
    }

    return false;
});
