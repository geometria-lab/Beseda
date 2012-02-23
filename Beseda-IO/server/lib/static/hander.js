var fs   = require('fs'),
    util = require('util'),
    zlib = require('zlib');

var Handler = function(options) {
    this.__options = {
        'stat'         : true,
        'cacheExpires' : null,
    };

    for (var name in options) {
        this.__options[name] = options[name];
    }

    this.__cache = {};
}

Handler.prototype.handleRequest = function(request, response, filePath) {
    if (this.__cache[filePath]) {
        if (this.__options.stat) {
            this._stat(request, function(request, response, filePath, callback, stat){
                if (this.__cache.get(filePath).mtime === stat.mtime) {
                    this.__processFromCache(request, response, filePath, callback);
                } else {
                    this.__processFromFile(request, response, filePath, callback);
                }
            }.bind(this));
        } else {
            this.__processFromCache(request, response, filePath, callback);
        }
    } else {
        this._stat(request, function(request, response, filePath, callback, stat){
            
            
            
            
            
            
            
            if (this.__cache.get(filePath).mtime === stat.mtime) {
                this.__processFromCache(request, response, filePath, callback);
            } else {
                this.__processFromFile(request, response, filePath, callback);
            }
        }.bind(this));
        
        
        
        
        
        
        
        
        this.__processFromFile(request, response, filePath, callback);
    }
    
    this._send(request, response, )
}

Handler.prototype.__processFromCache = function(request, response, filePath, callback) {
    var cache = this.__cache.get(request);
}

Handler.prototype.__processFromFile = function(request, response, filePath, callback) {
            try {
            var content = fs.readFileSync(file, 'utf8');
        } catch (e) {
            util.log('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

            Utils.send(response, 404);

            return;
        }
        
    this.__send()
}

Handler.prototype.__stat = function(request, response, filePath, callback, callback) {
    fs.stat(request.filePath, function(error, stat){
        if (error) {
            request.callback(error, request);
        } else {
            callback(request, stat);
        }
    });
}

file = {
    raw           : null,
    rawLength     : file.stat.size,
    gzip          : null,
    gzipLength    : null,
    deflate       : null,
    deflateLength : null,
    contentType   : null,
    encoding      : null,
    mtime         : null,
    eTag          : JSON.stringify([stat.ino, stat.size, mtime].join('-'));,
};

Handler.prototype.__send = function(request, response, fileMeta) {
    var headers = {
        'Last-Modified' : new Date(fileMeta.mtime).toUTCString(),
        'Server'        : 'Beseda'
    };

    if (this.__options.cacheExpires) {
        headers['Expires'] = new Date(Date.now() + (this.__options.cacheExpires * 1000)).toUTCString();
        headers['Date'] = new Date().toUTCString();
        headers['Cache-Control'] = 'public, x-gzip-ok="", max-age=' + this.__options.cacheExpires;
    } else {
        headers['Etag'] = fileMeta.eTag;
    }

    if (request.headers['if-none-match'] === fileMeta.eTag &&
        Date.parse(request.headers['if-modified-since']) >= Date.parse(fileMeta.mtime)) {

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
                var encoding = 'deflate';
            } else if (acceptEncoding.indexOf('gzip') !== false) {
                var encoding = 'gzip';
            }
    
            if (encoding) {
                headers['Content-Encoding'] = encoding;
                headers['Vary'] = 'Accept-Encoding';

                if (!fileMeta[encoding]) {
                    var self = this;
                    content = false;
                    fileMeta[encoding] = zlib[encoding](fileMeta.raw, function(error, result){
                        if (error) {
                            response.writeHead(500, headers);
                            response.end();
                        } else {
                            fileMeta[encoding] = result;
                            fileMeta[encoding + 'Length'] = result.length;

                            self.__sendContent(response, headers, fileMeta, encoding);
                        }
                    });
                } else {
                    content = encoding;
                }
            }
        }

        if (content) {
            self.__sendContent(response, headers, fileMeta, content);
        }
    }
}

Handler.prototype.__sendContent = function(response, headers, file, content) {
    headers['Content-Length'] = file[content + 'Length'];
    headers['Content-Type'] = file.contentType;

    response.writeHead(200, headers);
    response.end(content, file.encoding);
}



    
    
    
    fs.stat(file, function (error, stat) {
        if (error) {
            util.log('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

            Utils.send(response, 404);
        } else {
            
        }
    });
}

Handler.prototype.__getCache = function(request) {
    return this.__cache[request.filePath];
}



Static.prototype.__compress = function(type, data) {
    
}



Utils.sendFile = function(request, response, file, type) {
    
};