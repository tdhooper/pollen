var budo = require('budo');
var url = require('url');
var fs = require('fs');
var bodyParser = require('body-parser');
var empty = require('is-empty');

budo('./js/index.js', {
  live: true,
  stream: process.stdout,
  ssl: true,
  middleware: [
    bodyParser.json(),
    function(req, res, next) {
      if (url.parse(req.url).pathname === '/save') {
        if (empty(req.body)) {
          res.statusCode = 500;
          res.end('Missing content');
        }
        content = JSON.stringify(req.body, null, 4);
        content += '\n';
        fs.writeFile("/tmp/test", content, function(err) {
          if (err) {
            res.statusCode = 500;
            res.end(err);
          }
          res.statusCode = 200;
          res.end('Saved');
        });
      } else {
        next();
      }
    }
  ]
}).on('connect', function(ev) {
  //...
});
