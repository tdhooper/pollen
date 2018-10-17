var budo = require('budo');
var url = require('url');
var fs = require('fs');
var bodyParser = require('body-parser');
var empty = require('is-empty');
var crypto = require('crypto');
var path = require('path');

var saveLocation = path.join(__dirname, 'saved');

if ( ! fs.existsSync(saveLocation)){
  fs.mkdirSync(saveLocation);
}

budo('./js/index.js', {
  live: true,
  stream: process.stdout,
  ssl: true,
  middleware: [
    bodyParser.json(),
    function(req, res, next) {
      if (url.parse(req.url).pathname === '/save') {
        save(req, res);
      } else {
        next();
      }
    }
  ]
});

var save = function(req, res) {
  if (empty(req.body)) {
    res.statusCode = 500;
    res.end('Missing content');
    return;
  }

  var content = JSON.stringify(req.body, null);
  content += '\n';

  var filename = crypto.createHash('md5').update(content).digest("hex");
  filename += '.json';
  var file = path.join(saveLocation, filename);

  fs.writeFile(file, content, function(err) {
    if (err) {
      throw err;
    }
    res.statusCode = 200;
    res.end(filename);
  });
};
