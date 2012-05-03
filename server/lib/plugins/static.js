var fs   = require('fs'),
    zlib = require('zlib');

var Static = function(options) {
    this.__options = {
        'path'            : '/',
        'checkIsModified' : true,
        'cacheExpires'    : null,
        'files' : {
            'beseda.js' : { 
                'contentType' : 'text/javascript',
                'encoding'    : 'utf8',
                'path'        : __dirname + '/../../client/js/beseda.js'
            },
            'beseda.min.js' : { 
                'contentType' : 'text/javascript',
                'encoding'    : 'utf8',
                'path'        : __dirname + '/../../client/js/beseda.min.js'
            }
        }
    };

    for (var name in options) {
        this.__options[name] = options[name];
    }

    this.__cache = {};
};

Static.prototype.createServerCallback = function(server) {
    for (var name in this.__options.files) {
        server.router.get(this.__options.path + name, (function(file) {
            return function(request, response) {
                this.__handleRequest(request, response, file);
            }.bind(this)
        })(this.__options.files[name]));
    }
};

Static.prototype.__handleRequest = function(request, response, file) {
    var fileCache = this.__cache[file.path];
    if (fileCache) {
        if (this.__options.checkIsModified) {
            var stat = fs.statSync(file.path);
            if (fileCache.mtime !== stat.mtime) {
                fileCache = this.__createFileCache(file, stat);
            }
        }
    } else {
        var stat = fs.statSync(file.path);
        var fileCache = this.__createFileCache(file, stat);
    }

    this.__sendFile(request, response, fileCache);
};

Static.prototype.__createFileCache = function(file, stat) {
    this.__cache[file.path] = {
        raw           : fs.readFileSync(file.path),
        rawLength     : stat.size,
        gzip          : null,
        gzipLength    : null,
        deflate       : null,
        deflateLength : null,
        contentType   : file.contentType,
        encoding      : file.encoding,
        mtime         : stat.mtime,
        eTag          : JSON.stringify([stat.ino, stat.size, stat.mtime].join('-'))
    };

    return this.__cache[file.path];
};

Static.prototype.__sendFile = function(request, response, fileCache) {
    var headers = {
        'Last-Modified' : fileCache.mtime.toUTCString(),
        'Server'        : 'Beseda'
    };

    if (this.__options.cacheExpires) {
        headers['Expires'] = new Date(Date.now() + (this.__options.cacheExpires * 1000)).toUTCString();
        headers['Date'] = (new Date()).toUTCString();
        headers['Cache-Control'] = 'public, x-gzip-ok="", max-age=' + this.__options.cacheExpires;
    } else {
        headers['Etag'] = fileCache.eTag;
    }

    if (request.headers['if-none-match'] === fileCache.eTag &&
        Date.parse(request.headers['if-modified-since']) >= Date.parse(fileCache.mtime)) {

        response.writeHead(304, headers);
        response.end();
    } else if (request.method === 'HEAD') {
        response.writeHead(200, headers);
        response.end();
    } else {
        var content = 'raw';

        if (request.headers['accept-encoding']) {
            var acceptEncoding = request.headers['accept-encoding'].toLowerCase();
            var encoding = false;
            if (acceptEncoding.indexOf('deflate') !== false) {
                encoding = 'deflate';
            } else if (acceptEncoding.indexOf('gzip') !== false) {
                encoding = 'gzip';
            }
    
            if (encoding) {
                headers['Content-Encoding'] = encoding;
                headers['Vary'] = 'Accept-Encoding';

                if (!fileCache[encoding]) {
                    var self = this;
                    content = false;
                    fileCache[encoding] = zlib[encoding](fileCache.raw, function(error, result){
                        if (error) {
                            response.writeHead(500, headers);
                            response.end();
                        } else {
                            fileCache[encoding] = result;
                            fileCache[encoding + 'Length'] = result.length;

                            self.__sendContent(response, headers, fileCache, encoding);
                        }
                    });
                } else {
                    content = encoding;
                }
            }
        }

        if (content) {
            this.__sendContent(response, headers, fileCache, content);
        }
    }
};

Static.prototype.__sendContent = function(response, headers, fileCache, content) {
    headers['Content-Length'] = fileCache[content + 'Length'];
    headers['Content-Type'] = fileCache.contentType;

    response.writeHead(200, headers);
    response.end(content, fileCache.encoding);
};

module.exports = Static;