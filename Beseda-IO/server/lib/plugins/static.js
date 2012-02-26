var fs   = require('fs'),
    util = require('util'),
    zlib = require('zlib');

var router = require('../router');

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
            },
        }
    };

    for (var name in options) {
        this.__options[name] = options[name];
    }

    this.__cache = {};
};

Static.prototype.createServerCallback = function(server) {
    for (var name in this.__options.files) {
        server.router.get(this.__options.path + name, function(request, response, params){
            this.__handleRequest(request, response, this.__options.files[name]);
        }.bind(this));
    }
}

Static.prototype.__handleRequest = function(request, response, file) {
    var fileCache = this.__cache[file.path];
    if (fileCache) {
        if (this.__options.checkIsModified) {
            var stat = fs.statSync(file.path);
            if (fileCache.mtime !== stat.mtime) {
                var fileCache = this.__createFileCache(file, stat);
            }
        }
    } else {
        var stat = fs.statSync(file.path);
        var fileCache = this.__createFileCache(file, stat);
    }

    this.__sendFile(request, response, fileCache);
}

Static.prototype.__createFileCache = function(file, stat) {
    this.__cache[file.path] = {
        raw           : fs.readFileSync(filePath),
        rawLength     : stat.size,
        gzip          : null,
        gzipLength    : null,
        deflate       : null,
        deflateLength : null,
        contentType   : file.contentType,
        encoding      : file.encoding,
        mtime         : stat.mtime,
        eTag          : JSON.stringify([stat.ino, stat.size, stat.mtime].join('-')),
    };

    return this.__cache[file.path];
}

Static.prototype.__sendFile = function(request, response, fileCache) {
    var headers = {
        'Last-Modified' : fileCache.mtime.toUTCString(),
        'Server'        : 'Beseda'
    };

    if (this.__options.cacheExpires) {
        headers['Expires'] = new Date(Date.now() + (this.__options.cacheExpires * 1000)).toUTCString();
        headers['Date'] = new Date().toUTCString();
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
                var encoding = 'deflate';
            } else if (acceptEncoding.indexOf('gzip') !== false) {
                var encoding = 'gzip';
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
            self.__sendContent(response, headers, fileCache, content);
        }
    }
}

Static.prototype.__sendContent = function(response, headers, fileCache, content) {
    headers['Content-Length'] = fileCache[content + 'Length'];
    headers['Content-Type'] = fileCache.contentType;

    response.writeHead(200, headers);
    response.end(content, fileCache.encoding);
}

module.exports = Static;

/*


var fs   = require('fs'),
    util = require('util'),
    zlib = require('zlib'),
    mime = require('mime-magic');

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
    var fileMeta = this.__cache[filePath];
    if (fileMeta) {
        if (this.__options.stat) {
            var stat = fs.statSync(filePath);
            if (fileMeta.mtime !== stat.mtime) {
                var fileMeta = this.__createFileMeta(filePath, stat);
            }
        }
    } else {
        var stat = fs.statSync(filePath);
        var fileMeta = this.__createFileMeta(filePath, stat);
    }

    this.__sendFile(request, response, fileMeta);
}

Handler.prototype.__createMetaAndSendFile = function(request, response, filePath, stat) {
    var raw = fs.readFileSync(filePath);
    mime.fileWrapper(filePath, function (err, type) {
        if (err) {
            response.writeHead(500, { 'Server' : 'Beseda' });
        } else {
            var fileMeta = {
                raw           : data,
                rawLength     : stat.size,
                gzip          : null,
                gzipLength    : null,
                deflate       : null,
                deflateLength : null,
                contentType   : null,
                encoding      : null,
                mtime         : null,
                eTag          : JSON.stringify([stat.ino, stat.size, stat.mtime].join('-')),
            };
        }
    });
}

Handler.prototype.__processFromFile = function(request, response, filePath, stat) {
    fs.readFile(filePath, function(err, data) {
        if (err) {
            response.writeHead(500, { 'Server' : 'Beseda' });
            response.end();
        } else {
            

            this._send(request, response, fileMeta);
        }
    });
}
    
    
    
            try {
            var content = fs.readFileSync(file, 'utf8');
        } catch (e) {
            util.log('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

            Utils.send(response, 404);

            return;
        }
        
    this.__send()
}

Handler.prototype.__send = function(request, response, fileMeta) {
    var headers = {
        'Last-Modified' : fileMeta.mtime.toUTCString(),
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

/*
Route.prototype.isValid = function(request, parsedURL) {
    var result = false;

    if (request.method == 'HEAD' || request.method == 'GET') {
		result = true;

		var requestPathHash = parsedURL.path;

        var i = 0, 
			l = this.__pathHash.length;

		while (i < l) {
			if (this.__pathHash[i] != requestPathHash[i]) {
				result = false;

				break;
			}

			++i;
		}
    }

    return result;
};

Route.prototype.dispatch = function(request, response, parsedURL) {
    var parsedPath = parsedURL.path;
	var filePath = [ this.__filePath ];

    for (var i = this.__pathHash.length - 1; i < parsedPath.length; i++) {
        filePath.push(parsedPath[i]);
    }

    this.__handler.handleRequest(
        request,
        response,
        filePath.join('/')
    );
};
*/

*/