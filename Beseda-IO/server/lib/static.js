var fs   = require('fs'),
    util = require('util'),
    zlib = require('zlib');
    
var Static = function(options){
    this.__options = {
        stat : true
    };

    for (var name in options) {
        this.__options[name] = options[name];
    }

    this.__cache = {};
}

Static.prototype.process = function(request, response, filePath, contentType, callback) {
    if (this.__cache[filePath]) {
        if (this.__options.stat) {
            fs.stat(filePath, function(error, stat){
                if (error) {
                    callback(error, request, response, filePath, contentType);
                } else {
                    if (this.__cache[filePath].mtime === stat.mtime) {
                        this.__processFromCache();
                    } else {
                        this.__processFromFile();
                    }
                }
            });
        } else {
            this.__processFromCache();
        }
    } else {
        this.__processFromFile();
    }
}

Static.prototype.__processFromCache = function() {

}

Static.prototype.__processFromFile = function(request, response, filePath, contentType, callback) {
    fs.stat(filePath, function(error, stat){
        if (error) {
            callback(error, request, response, filePath, contentType);
        } else {
            if (this.__cache[filePath].mtime === stat.mtime) {
                this.__processFromCache();
            } else {
                this.__processFromFile();
            }
        }
    });
}

Static.prototype._getStat
    
    
    
    fs.stat(file, function (error, stat) {
        if (error) {
            util.log('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

            Utils.send(response, 404);
        } else {
            var mtime   = Date.parse(stat.mtime),
                headers = {
                    'Etag'          : JSON.stringify([stat.ino, stat.size, mtime].join('-')),
                    'Date'          : new(Date)().toUTCString(),
                    'Last-Modified' : new(Date)(stat.mtime).toUTCString(),
                    'Server'        : 'Beseda',
                    'Cache-Control' : 'max-age=3600'
                };

            if (request.headers['if-none-match'] === headers['Etag'] &&
                Date.parse(request.headers['if-modified-since']) >= mtime) {

                Utils.send(response, 304, headers);
            } else if (request.method === 'HEAD') {
                this.send(200, headers);
            } else {
                headers['Content-Length'] = stat.size;
                headers['Content-Type']   = type;

                try {
                    var content = fs.readFileSync(file, 'utf8');
                } catch (e) {
                    util.log('Can\'t send file "' + request.url + ' (' + file +')": ' + error);

                    Utils.send(response, 404);

                    return;
                }

                response.writeHead(200, headers);
                response.end(content, 'utf8');
            }
        }
    });
}

Static.prototype.cleanCache = function() {
    this.__cache = {};
}

Static.prototype.__compress = function(type, data) {
    
}



Utils.sendFile = function(request, response, file, type) {
    
};