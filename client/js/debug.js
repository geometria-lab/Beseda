var beseda = new Beseda();

$(document).delegate('#post', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#post .channel').val();
    var message = $('#post .message').val();
    $('#post .channel, #post .message').val('');

    if (message.length) {
        beseda.publish(channel, message);
    }

    return false;
});

$(document).delegate('#subscribe', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#subscribe .channel').val();
    $('#subscribe .channel').val('');

    if (channel.length) {
        beseda.subscribe(channel, function(error) {
            if (error) {
                console.log(error);
            } else {
                $('#subscriptions').append('<li class="' + channel + '">' + channel + '</li>');
            }
        });
    }

    return false;
});

$(document).delegate('#unsubscribe', 'submit', function(event) {
    event.preventDefault();

    var channel = $('#unsubscribe .channel').val();
    $('#unsubscribe .channel').val('');

    if (channel.length) {
        beseda.unsubscribe(channel, function(error) {
            if (error) {
                console.log(error);
            } else {
                $('#subscriptions .' + channel).remove();
            }
        });
    }

    return false;
});

beseda.on('message', function(channel, message, fullMessage) {
    console.log('Message', fullMessage);
    $('#messages').prepend('<li><span class="channel">' + channel + '</span><span class="timestamp">' + (new Date().toString()) + '</span></li><pre class="data">' + JSON.stringify(fullMessage) + '</pre>');
});