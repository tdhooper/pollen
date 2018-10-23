var budo = require('budo');
var url = require('url');
var fs = require('fs');
var bodyParser = require('body-parser');
var empty = require('is-empty');
var crypto = require('crypto');
var path = require('path');
var multiparty = require('multiparty');
var util = require('util');

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
      pathname = url.parse(req.url).pathname;

      var match = pathname.match(/\/save\/([^\/]*)/);
      if (match) {
        save(req, res, match[1]);
        return;
      }

      if (pathname == '/upload') {
        upload(req, res);
        return;
      }

      next();
    }
  ]
});

var save = function(req, res, name) {

  if (empty(req.body)) {
    res.statusCode = 500;
    res.end('Missing content');
    return;
  }

  var content = JSON.stringify(req.body, null, 2);
  content += '\n';

  filename = name + '.json';
  var file = path.join(saveLocation, filename);

  fs.writeFile(file, content, function(err) {
    if (err) {
      throw err;
    }
    res.statusCode = 200;
    res.end(filename);
  });
};

var upload = function(req, res) {
  var form = new multiparty.Form({
    autoFiles: true
  });

  form.on('file', function(name, file) {
    var filename = path.join(saveLocation, file.originalFilename);
    fs.renameSync(file.path, filename);
    res.end(file.originalFilename);
  });

  form.parse(req);
};
