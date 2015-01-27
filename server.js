// Simple Node server to proxy and cache requests to search.maven.org

var http = require('http');
var url = require('url');
var request = require('request');

var cache = {};
var server = http.createServer(function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    var query = url.parse(req.url, true).query;
    if (query['q'] && query['rows'] && query['start']) {
        var searchUrl = 'http://search.maven.org/solrsearch/select?wt=json&q=' + query['q'] + "&rows=" + query['rows'] + "&start=" + query['start'];

        if (cache[searchUrl]) {
            console.log("From cache: " + searchUrl);
            res.end(cache[searchUrl]);
        } else {
            console.log(searchUrl);
            request(searchUrl, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    cache[searchUrl] = body;
                    res.end(body);
                }
            });
        }
    } else {
        res.end("Parameters q, rows and start required.");
    }
});
server.listen(8888);
