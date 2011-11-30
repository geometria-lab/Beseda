/*
    http://www.JSON.org/json2.js
    2011-02-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : 'null';
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
	    /**
	     *
	     * @param {*} value
	     * @param {function()=} replacer
	     * @param {string=} space
	     */
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
	    /**
	     *
	     * @param {string} text
	     * @param {function()=} reviver
	     */
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

var BesedaPackage = {};
BesedaPackage.utils = {};
BesedaPackage.events = {};
BesedaPackage.transport = {};
BesedaPackage.transport.request = {};

/**
 * @constructor
 */
BesedaPackage.events.EventEmitter = function() { };

BesedaPackage.events.EventEmitter.defaultMaxListeners = 10;
BesedaPackage.events.EventEmitter.isArray = Array.isArray || function(o) { return Object.prototype.toString.call(o) === '[object Array]'; };

BesedaPackage.events.EventEmitter.prototype.setMaxListeners = function(n) {
    if (!this._events) this._events = {};
    this._events.maxListeners = n;
};

/**
 * 
 * @param {string} type
 * @param {... Object} var_args
 */
BesedaPackage.events.EventEmitter.prototype.emit = function(type, var_args) {
    // If there is no 'error' event listener then throw.
    if (type === 'error') {
        if (!this._events || !this._events.error ||
                (BesedaPackage.events.EventEmitter.isArray(this._events.error) && !this._events.error.length))
        {
            if (arguments[1] instanceof Error) {
                throw arguments[1]; // Unhandled 'error' event
            } else {
                throw new Error("Uncaught, unspecified 'error' event.");
            }
        }
    }

    if (!this._events) return false;
    var handler = this._events[type];
    if (!handler) return false;

    if (typeof handler == 'function') {
        switch (arguments.length) {
            // fast cases
            case 1:
                handler.call(this);
                break;
            case 2:
                handler.call(this, arguments[1]);
                break;
            case 3:
                handler.call(this, arguments[1], arguments[2]);
                break;
            // slower
            default:
                var args = Array.prototype.slice.call(arguments, 1);
                handler.apply(this, args);
        }
        return true;

    } else if (BesedaPackage.events.EventEmitter.isArray(handler)) {
        var args = Array.prototype.slice.call(arguments, 1);

        var listeners = handler.slice();
        for (var i = 0, l = listeners.length; i < l; i++) {
            listeners[i].apply(this, args);
        }
        return true;

    } else {
        return false;
    }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
BesedaPackage.events.EventEmitter.prototype.addListener = function(type, listener) {
    if ('function' !== typeof listener) {
        throw new Error('addListener only takes instances of Function');
    }

    if (!this._events) this._events = {};

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if (!this._events[type]) {
        // Optimize the case of one listener. Don't need the extra array object.
        this._events[type] = listener;
    } else if (BesedaPackage.events.EventEmitter.isArray(this._events[type])) {

        // If we've already got an array, just append.
        this._events[type].push(listener);

        // Check for listener leak
        if (!this._events[type].warned) {
            var m;
            if (this._events.maxListeners !== undefined) {
                m = this._events.maxListeners;
            } else {
                m = BesedaPackage.events.EventEmitter.defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
                alert('(node) warning: possible EventEmitter memory ' +
					  'leak detected. %d listeners added. ' +
					  'Use emitter.setMaxListeners() to increase limit. ' +
					  this._events[type].length);
            }
        }
    } else {
        // Adding the second element, need to change to array.
        this._events[type] = [this._events[type], listener];
    }

    return this;
};

BesedaPackage.events.EventEmitter.prototype.on =
	BesedaPackage.events.EventEmitter.prototype.addListener;

BesedaPackage.events.EventEmitter.prototype.once = function(type, listener) {
    if ('function' !== typeof listener) {
        throw new Error('.once only takes instances of Function');
    }

    var self = this;
    function g() {
        self.removeListener(type, g);
        listener.apply(this, arguments);
    };

    g.listener = listener;
    self.on(type, g);

    return this;
};

BesedaPackage.events.EventEmitter.prototype.removeListener = function(type, listener) {
    if ('function' !== typeof listener) {
        throw new Error('removeListener only takes instances of Function');
    }

    // does not use listeners(), so no side effect of creating _events[type]
    if (!this._events || !this._events[type]) return this;

    var list = this._events[type];

    if (BesedaPackage.events.EventEmitter.isArray(list)) {
        var position = -1;
        for (var i = 0, length = list.length; i < length; i++) {
            if (list[i] === listener ||
                    (list[i].listener && list[i].listener === listener))
            {
                position = i;
                break;
            }
        }

        if (position < 0) return this;
        list.splice(position, 1);
        if (list.length == 0)
            delete this._events[type];
    } else if (list === listener ||
                         (list.listener && list.listener === listener))
    {
        delete this._events[type];
    }

    return this;
};

BesedaPackage.events.EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
        this._events = {};
        return this;
    }

    // does not use listeners(), so no side effect of creating _events[type]
    if (type && this._events && this._events[type]) this._events[type] = null;
    return this;
};

BesedaPackage.events.EventEmitter.prototype.listeners = function(type) {
    if (!this._events) this._events = {};
    if (!this._events[type]) this._events[type] = [];
    if (!BesedaPackage.events.EventEmitter.isArray(this._events[type])) {
        this._events[type] = [this._events[type]];
    }
    return this._events[type];
};

BesedaPackage.utils.cloneObject = function(object) {
	return BesedaPackage.utils.mergeObjects({}, object);
};

BesedaPackage.utils.mergeObjects = function(object, extend) {
	for (var p in extend) {
		try {
			if (extend[p].constructor == Object) {
				object[p] = BesedaPackage.utils.mergeObjects(object[p], extend[p]);
			} else {
				object[p] = extend[p];
			}
		} catch (e) {
			object[p] = extend[p];
		}
	}

	return object;
};


BesedaPackage.utils.inherits = function(Class, Parent) {
	/** @constructor */
	var Link = function() {};
	Link.prototype = Parent.prototype;

	Class.prototype = new Link();
	Class.prototype.constructor = Class;
};

BesedaPackage.utils.log = function(message) {
	if (window.console) {
		window.console.log(message);
	}
};

BesedaPackage.utils.__base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
BesedaPackage.utils.__base64charsLength = BesedaPackage.utils.__base64chars.length;

/**
 * @param {number=} length
 */
BesedaPackage.utils.uid = function(length) {
	length = length || 10;

	for (var i = 0, id = []; i < length; i++) {
		id[i] = BesedaPackage.utils.__base64chars[0 | Math.random() * BesedaPackage.utils.__base64charsLength];
	}

	return id.join('');
};



/**
 * @constructor
 * @extends {BesedaPackage.events.EventEmitter}
 */
BesedaPackage.Client = function(options) {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this.__options = BesedaPackage.utils.mergeObjects({
        host : document.location.hostname,
        port : 4000,
        ssl  : false,

        transports : [ 'webSocket', 'longPolling', 'JSONPLongPolling' ]
    }, options);

	this._io = null;

    this.__status = BesedaPackage.Client.__statuses.DISCONNECTED;
    this.__messageQueue = [];
	this.__channels = [];

    this.router   = new BesedaPackage.Router(this);
    this.clientId = null;

	this._init();
};

BesedaPackage.utils.inherits(BesedaPackage.Client, BesedaPackage.events.EventEmitter);

BesedaPackage.Client.__statuses = {
    DISCONNECTED : 0,
    CONNECTING   : 1,
    CONNECTED    : 2
};

BesedaPackage.Client.prototype._init = function() {
	this._io = new BesedaPackage.IO(this.__options);

    var self = this;
    this._io.addListener('message', function(message) {
        self.router.dispatch(message);
    });

    this._io.addListener('error', function() {
	    self.__destroy();

        setTimeout(function(){
	        self.connect();
        }, 5000)
    });

    this.__firstMessage = null;
    this.__handleConnectionClosure = function(connectionID) {
        self.clientId = connectionID;

        var message = self.__createMessage('/meta/connect', self.__firstMessage);

        self._io.send(message);
        self.__firstMessage = null;
    };
};

BesedaPackage.Client.prototype.isConnected = function() {
    return this.__status == BesedaPackage.Client.__statuses.CONNECTED;
};

BesedaPackage.Client.prototype.isDisconnected = function() {
    return this.__status == BesedaPackage.Client.__statuses.DISCONNECTED;
};

BesedaPackage.Client.prototype.isConnecting = function() {
    return this.__status == BesedaPackage.Client.__statuses.CONNECTING;
};

BesedaPackage.Client.prototype.subscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this.__sendMessage('/meta/subscribe', message);

	var self = this;
    this.once('subscribe:' + message.id, function(error) {
        if (!error) {
	        self.__channels[channel] = message;
        }
    });

    if (callback) {
        this.once('subscribe:' + message.id, callback);
    }
};

BesedaPackage.Client.prototype.unsubscribe = function(channel, callback, additionalMessage) {
    if (this.isDisconnected()) {
        this.connect();
    }

    var message = additionalMessage || {};
    message.subscription = channel;

    message = this.__sendMessage('/meta/unsubscribe', message);

	var self = this;
    this.once('unsubscribe:' + message.id, function(error) {
        if (!error) {
            delete self.__channels[channel];
        }
    });

    if (callback) {
        this.once('unsubscribe:' + message.id, callback);
    }
};


BesedaPackage.Client.prototype.publish = function(channel, message, callback) {
    if (this.isDisconnected()) {
        this.connect();
    }

    message = this.__sendMessage(channel, { data : message });

    if (callback) {
        this.once('publish:' + message.id, callback);
    }
};

/**
 *
 * @param {string=}  host
 * @param {number=} port
 * @param {boolean=} ssl
 * @param {Object=} message
 */
BesedaPackage.Client.prototype.connect = function(host, port, ssl, message) {
	//TODO: Do somethinng when connecting
    if (!this.isConnected()) {
		this.__status = BesedaPackage.Client.__statuses.CONNECTING;
		this.__firstMessage = message;

	    //TODO: Nothing happen if another connet listener appear
		if (!this._io.listeners('connect').length) {
			this._io.on('connect', this.__handleConnectionClosure);
		}

		this._io.connect(host, port, ssl);

	    //TODO: Move to another method
		for (var key in this.__channels) {
			this.__sendMessage('/meta/subscribe', this.__channels[key]);
		}
    }
};

BesedaPackage.Client.prototype.disconnect = function() {
    this._io.disconnect();

	//TODO: Handle with it
	this.__channels = [];
	this.__destroy();

	this.emit('disconnect');
};

BesedaPackage.Client.prototype.applyConnection = function() {
    this.__status = BesedaPackage.Client.__statuses.CONNECTED;
    this.__flushMessageQueue();
};

BesedaPackage.Client.prototype.__destroy = function() {
	this.__status = BesedaPackage.Client.__statuses.DISCONNECTED;

	this.clientId = null;
	this.__messageQueue = [];
};

BesedaPackage.Client.prototype.__sendMessage = function(channel, message) {
    if (!this.isDisconnected()) {
        message = this.__createMessage(channel, message);

        if (this.isConnecting()) {
            this.__messageQueue.push(message);
        } else {
            this._io.send(message);
        }

        return message;
    }
};

BesedaPackage.Client.prototype.__createMessage = function(channel, message) {
    message = message || {};

    message.id       = BesedaPackage.utils.uid();
    message.channel  = channel;
    message.clientId = this.clientId;

    return message;
};


BesedaPackage.Client.prototype.__flushMessageQueue = function() {
    for (var i = 0; i < this.__messageQueue.length; i++) {
        this.__messageQueue[i].clientId = this.clientId;
    }

    this._io.send(this.__messageQueue);
    this.__messageQueue = [];
};

var Beseda = BesedaPackage.Client;

/**
 * @constructor
 */
BesedaPackage.Router = function(client) {
    this.__client = client;
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean, clientId: string }} message
 */
BesedaPackage.Router.prototype.dispatch = function(message) {
    if (message.channel == undefined ||
        message.clientId == undefined ||
        message.id == undefined) {

        this.__client.emit('error', 'Beseda receive incorrect message', message);
    } else {
        if (message.channel.indexOf('/meta/') == 0) {
            var metaChannel = message.channel.substr(6);

            if (!metaChannel in ['connect', 'error', 'subscribe', 'unsubscribe']) {
                this.__client.emit('error', 'Unsupported meta channel ' + message.channel, message);
            } else {
                this['_' + metaChannel].call(this, message);
            }
        } else if ('successful' in message) {
            this._publish(message);
        } else {
            this._message(message);
        }
    }
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._connect = function(message) {
    if (message.successful) {
        this.__client.applyConnection();
        this.__client.emit('connect', message);
    } else {
        this.__client.disconnect();
        this.__client.emit('error', 'Beseda connection request declined', message);
    }
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._error = function(message) {
    this.__client.emit('error', message.data, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, success: boolean }} message
 */
BesedaPackage.Router.prototype._subscribe = function(message) {
    if (!message.successful) {
        this.__client.emit('error', message.error, message);
    }

    this.__client.emit('subscribe', message.error, message);
    this.__client.emit('subscribe:' + message.id, message.error, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._unsubscribe = function(message) {
    if (!message.successful) {
        this.__client.emit('error', message.error, message);
    }

    this.__client.emit('unsubscribe', message.error, message);
    this.__client.emit('unsubscribe:' + message.id, message.error, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._publish = function(message) {
    if (!message.successful) {
        this.__client.emit('error', message.error, message);
    }

    this.__client.emit('publish:' + message.id, message.error, message);
    this.__client.emit('publish', message.error, message);
};

/**
 * @param {{ channel: string, data: string, id: string, error: string, successful: boolean }} message
 */
BesedaPackage.Router.prototype._message = function(message) {
    this.__client.emit('message:' + message.channel, message.data, message);
    this.__client.emit('message', message.channel, message.data, message);
};


/**
 * @constructor
 * @extends BesedaPackage.events.EventEmitter
 */
BesedaPackage.IO = function(options) {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this.__options = options;

    this.__transport = BesedaPackage.Transport.getBestTransport(options);
    this.__transport.setEmitter(this);
};

BesedaPackage.utils.inherits(BesedaPackage.IO, BesedaPackage.events.EventEmitter);

BesedaPackage.IO.prototype.connect = function(host, port, ssl) {
	if (host !== undefined) this.__options.host = host;
	if (port !== undefined) this.__options.port = port;
	if (ssl  !== undefined) this.__options.ssl = ssl;

    this.__transport.connect(
	    this.__options.host,
	    this.__options.port,
	    this.__options.ssl
    );
};

BesedaPackage.IO.prototype.send = function(messages) {
	this.__transport.send([].concat(messages));
};

BesedaPackage.IO.prototype.disconnect = function() {
    this.__transport.disconnect();
};


/**
 * @constructor
 */
BesedaPackage.Transport = function() {
    this._url          = null;
    this._typeSuffix   = null;
    this._connectionID = null;
    this._emitter      = null;

	this._isConnected  = false;

	this._typeSuffix = null;

    this.__sendQueue = [];
	this.__pendingMessages = {};
};

BesedaPackage.Transport.__transports = {
    'longPolling'      : 'LongPolling',
    'JSONPLongPolling' : 'JSONPLongPolling',
	'webSocket'        : 'WebSocket'
};

BesedaPackage.Transport.getBestTransport = function(options) {
	var TransportClass;

    for(var i = 0; i < options.transports.length; i++) {
	    switch (options.transports[i]) {
		    case 'longPolling':
		        TransportClass = BesedaPackage.transport.LongPolling;
		        break;

		    case 'JSONPLongPolling':
		        TransportClass = BesedaPackage.transport.JSONPLongPolling;
			    break;

		    case 'webSocket':
		        TransportClass = BesedaPackage.transport.WebSocket;
			    break;

		    default:
		         throw Error('Ivalid transport ' + options.transports[i]);
	    }

	    if (TransportClass.isAvailable(options)) {
		    break;
	    }
    }

	return new TransportClass();
};

BesedaPackage.Transport.prototype.connect = function(host, port, ssl) {
    throw Error('Abstract method calling.');
};


BesedaPackage.Transport.prototype.send = function(messages) {
	if (this._isConnected) {
		var i = messages.length - 1;
		while (i >= 0) {
			this.__pendingMessages[messages[i].id] = true;
			i--;
		}

		this._doSend(JSON.stringify(messages));
	} else {
		this._enqueue(messages);
	}
};

BesedaPackage.Transport.prototype._doSend = function(data) {
	throw Error('Abstract method calling.');
};

BesedaPackage.Transport.prototype.disconnect = function() {
    throw Error('Abstract method calling.');
};

BesedaPackage.Transport.prototype.setEmitter = function(emitter) {
    this._emitter = emitter;
};

BesedaPackage.Transport.prototype._handleConnection = function(id) {
    this._connectionID = id;

    if (this._emitter) {
        this._emitter.emit('connect', this._connectionID);
    }
    
    while(this.__sendQueue.length) {
        this.send(this.__sendQueue.shift());
    }
};

BesedaPackage.Transport.prototype._handleMessages = function(messages) {
	var message;
	while(messages && messages.length) {
		message = messages.shift()

		this._emitter.emit('message', message);

		delete this.__pendingMessages[message.id];
	}
};

BesedaPackage.Transport.prototype._handleError = function(error) {
	var messages = [];
    for (var id in this.__pendingMessages) {
	    messages.push(this.__pendingMessages[id]);

		this._emitter.emit('message:' + id, error);
	}

	if (messages.length) {
		this._enqueue(messages);
	}
	
	this._emitter.emit('error');
	this.__pendingMessages = {};
};

BesedaPackage.Transport.prototype._decodeData = function(data) {
	return JSON.parse(data);
}

BesedaPackage.Transport.prototype._enqueue = function(data) {
    this.__sendQueue.push(data);
};



/**
 * @constructor
 * @extends BesedaPackage.Transport
 */
BesedaPackage.transport.LongPolling = function() {
    BesedaPackage.Transport.prototype.constructor.call(this);

    this._typeSuffix = 'longPolling';

	this._url = null;

    this._openRequest  = null;
    this._dataRequest  = null;
    this._sendRequest  = null;
    this._closeRequest = null;

	this.__handleOpenClosure = null;
	this.__handleDataClosure = null;
	this.__handleCloseClosure = null;

	this.__initClosuredHandlers();

	this._initRequests();
	this._initListeners();
};

BesedaPackage.utils.inherits(BesedaPackage.transport.LongPolling, BesedaPackage.Transport);

BesedaPackage.transport.LongPolling.isAvailable = function(options) {
    return document.location.hostname === options.host && (document.location.port || 80) == options.port;
};

BesedaPackage.transport.LongPolling.prototype.__initClosuredHandlers = function() {
	var self = this;

    this.__handleOpenClosure = function(data) {
        self._handleOpen(data);
    };

    this.__handleDataClosure = function(data) {
        self._handleData(data);
    };

    this.__handleCloseClosure = function(data) {
        self._handleError(data);
    };
};

BesedaPackage.transport.LongPolling.prototype._initRequests = function() {
	// TODO: Use only two requests: send and data
    this._openRequest  = new BesedaPackage.transport.request.XHRRequest('GET');
    this._dataRequest  = new BesedaPackage.transport.request.XHRRequest('GET');
    this._sendRequest  = new BesedaPackage.transport.request.XHRRequest('PUT');
    this._closeRequest = new BesedaPackage.transport.request.XHRRequest('DELETE');
};

BesedaPackage.transport.LongPolling.prototype._initListeners = function() {
	this._openRequest.addListener('ready', this.__handleOpenClosure);
	this._openRequest.addListener('error', this.__handleCloseClosure);

	this._dataRequest.addListener('ready', this.__handleDataClosure);
	this._dataRequest.addListener('error', this.__handleCloseClosure);
}

BesedaPackage.transport.LongPolling.prototype._initURLs = function(id) {
	this._sendRequest.url =
    this._dataRequest.url =
    this._closeRequest.url =
        this._url + "/" + this._typeSuffix + "/" + id;
};

BesedaPackage.transport.LongPolling.prototype.connect = function(host, port, ssl) {
    this._url = 'http' + (ssl ? 's' : '') + '://' +
	            host + (port ? ':' + port : '') +
	            '/beseda/io';

    this._openRequest.send(this._url + "/" + this._typeSuffix);
};

BesedaPackage.transport.LongPolling.prototype._handleOpen = function(connectionData) {
	/**
	 * @type {{ connectionId: string }}
	 */
    var data = this._decodeData(connectionData);

	this._isConnected = true;

	this._initURLs(data.connectionId);

    BesedaPackage.Transport.prototype._handleConnection.call(this, data.connectionId);

    this.__poll();
};

BesedaPackage.transport.LongPolling.prototype._doSend = function(data) {
	this._sendRequest.data = data;
    this._sendRequest.send();
};

BesedaPackage.transport.LongPolling.prototype.disconnect = function() {
    this._closeRequest.send();
	this._isConnected = false;
};

BesedaPackage.transport.LongPolling.prototype._handleData = function(data) {
    BesedaPackage.Transport.prototype._handleMessages.call(this, this._decodeData(data));

    this.__poll();
};

BesedaPackage.transport.LongPolling.prototype.__poll = function() {
    if (this._isConnected) {
        this._dataRequest.send();
    }
};



/**
 * @constructor
 * @extends BesedaPackage.transport.LongPolling
 */
BesedaPackage.transport.JSONPLongPolling = function() {
    BesedaPackage.transport.LongPolling.prototype.constructor.call(this);

    this._typeSuffix = 'JSONPLongPolling';
};

BesedaPackage.utils.inherits(BesedaPackage.transport.JSONPLongPolling, BesedaPackage.transport.LongPolling);

BesedaPackage.transport.JSONPLongPolling.isAvailable = function(options) {
    return true;
};

BesedaPackage.transport.JSONPLongPolling.prototype._initRequests = function() {
    this._openRequest  = new BesedaPackage.transport.request.JSONPRequest();
    this._dataRequest  = new BesedaPackage.transport.request.JSONPRequest();
    
    this._sendRequest  = new BesedaPackage.transport.request.JSONPRequest();
    this._closeRequest = new BesedaPackage.transport.request.JSONPRequest();
};

BesedaPackage.transport.JSONPLongPolling.prototype._initURLs = function(id) {
	BesedaPackage.transport.LongPolling.prototype._initURLs.call(this, id);

	this._sendRequest.url  += '/send';
    this._closeRequest.url += '/destroy';
};

BesedaPackage.transport.JSONPLongPolling.prototype._decodeData = function(data) {
    return data;
};


/**
 * @constructor
 * @extends BesedaPackage.Transport
 */
BesedaPackage.transport.WebSocket = function() {
	BesedaPackage.Transport.prototype.constructor.call(this);

	this._typeSuffix = 'webSocket';

	this.__ws = null;

	this.__handleOpenClosure = null;
	this.__handleDataClosure = null;
	this.__handleCloseClosure = null;

	this.__initClosuredHandlers();
};

BesedaPackage.utils.inherits(BesedaPackage.transport.WebSocket, BesedaPackage.Transport);

BesedaPackage.transport.WebSocket.isAvailable = function(options) {
	return  !!window.WebSocket;
};

BesedaPackage.transport.WebSocket.prototype.__initClosuredHandlers = function() {
	var self = this;

	this.__handleOpenClosure = function(event) {
		self.__handleOpen(event);
	};

	this.__handleDataClosure = function(event) {
		self.__handleData(event);
	};

	this.__handleCloseClosure = function(event) {
		self.__handleClose(event);
	};
};

BesedaPackage.transport.WebSocket.prototype.connect = function(host, port, ssl) {
	if (!this._isConnected) {
		this.__ws = new WebSocket(
			'ws' + (ssl ? 's' : '') + '://' +
			host + (port ? ':' + port : '') +
			'/beseda/io/' + this._typeSuffix + '/' +
			(new Date().getTime())
		);

		this.__ws.addEventListener('open',    this.__handleOpenClosure, false);
		this.__ws.addEventListener('message', this.__handleDataClosure, false);
		this.__ws.addEventListener('error',   this.__handleCloseClosure, false);
		this.__ws.addEventListener('close',   this.__handleCloseClosure, false);
	}
};

BesedaPackage.transport.WebSocket.prototype.disconnect = function() {
	this.__ws['close']();
	this._isConnected = false;
};

BesedaPackage.transport.WebSocket.prototype._doSend = function(data) {
	this.__ws['send'](data);
};

BesedaPackage.transport.WebSocket.prototype.__handleOpen = function(event) {
	this._isConnected = true;
};

BesedaPackage.transport.WebSocket.prototype.__handleData = function(event) {
	/**
	 * @type {{ connectionId: string }}
	 */
	var data = this._decodeData(event.data);

	if (!this.__handshaked) {
		this.__handshaked = true;

		BesedaPackage.Transport.prototype._handleConnection.call(this, data.connectionId);
	} else {
		BesedaPackage.Transport.prototype._handleMessages.call(this, data);
	}
};

BesedaPackage.transport.WebSocket.prototype.__handleClose = function(event) {
	this._handleError(event);
	this.disconnect();
};




/**
 * @constructor
 * @extends BesedaPackage.events.EventEmitter
 */
BesedaPackage.transport.request.XHRRequest = function(method) {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this.url = null;
    this.method = method;
    this.data = null;
};

BesedaPackage.utils.inherits(BesedaPackage.transport.request.XHRRequest, BesedaPackage.events.EventEmitter);

/**
 *
 * @param {string=} url
 */
BesedaPackage.transport.request.XHRRequest.prototype.send = function(url) {
    if (url) {
        this.url = url;
    }

    var requestURL = this.url + '/' + (new Date().getTime());
    var request = !!+'\v1' ? new XMLHttpRequest() :
                             new ActiveXObject("Microsoft.XMLHTTP");

    var self = this;
    request.onreadystatechange = function() {
        self.__requestStateHandler(request);
    };

    if (this.method === 'GET' && this.data) {
        requestURL +=
            (requestURL.indexOf('?') === -1 ? '?' : '&') + this.data;
    }

    request.open(this.method, encodeURI(requestURL), true);

    var sendData = null;
    if (this.method !== 'GET') {
        sendData = this.data;
        request.setRequestHeader
	        ('Content-Type', 'application/x-www-form-urlencoded');
    }

    request.send(sendData);
};

BesedaPackage.transport.request.XHRRequest.prototype.__requestStateHandler = function(request) {
    if (request.readyState === 4) {
        if (request.status === 200) {
            this.emit('ready', request.responseText);
        } else {
            this.emit('error');
        }

        request.abort();
	    request = null;
    }
};


/**
 * @constructor
 * @extends BesedaPackage.events.EventEmitter
 */
BesedaPackage.transport.request.JSONPRequest = function() {
    BesedaPackage.events.EventEmitter.prototype.constructor.call(this);

    this.url = null;
    this.data = '';

    this.__id = ++BesedaPackage.transport.request.JSONPRequest.__lastID;
    this.__requestIndex = 0;
};

BesedaPackage.utils.inherits(BesedaPackage.transport.request.JSONPRequest, BesedaPackage.events.EventEmitter);

BesedaPackage.transport.request.JSONPRequest.__callbacks = {};
BesedaPackage.transport.request.JSONPRequest.__lastID = 0;

BesedaPackage.transport.request.JSONPRequest.ERROR_TIMEOUT = 15000;

/**
 *
 * @param {string=} url
 */
BesedaPackage.transport.request.JSONPRequest.prototype.send = function(url) {
    if (url) {
        this.url = url;
    }

	var script = document.createElement('script');
	script.id = 'request_' + this.__id + '_' + this.__requestIndex;

    var requestURL = this.url + '/' + (new Date().getTime()) +
        '?callback=BesedaPackage.transport.request.JSONPRequest.__callbacks["' +
            script.id + '"]&messages=' + this.data;

	script.src = requestURL;

	///////////////////////////////////////////////////////////////////////////

	var self = this;
	var timeout = setTimeout(function() {
		clearTimeout(timeout);

		document.body.removeChild(script);

		delete BesedaPackage.transport.request.JSONPRequest.__callbacks[script.id];

		self.emit('error');
	}, BesedaPackage.transport.request.JSONPRequest.ERROR_TIMEOUT);

	BesedaPackage.transport.request.JSONPRequest.__callbacks[script.id] = function(data) {
		clearTimeout(timeout);

		document.body.removeChild(script);

		delete BesedaPackage.transport.request.JSONPRequest.__callbacks[script.id];

		self.emit('ready', data);
	};

	///////////////////////////////////////////////////////////////////////////

    document.body.appendChild(script);

	this.__requestIndex++;
    this.data = null;
};



