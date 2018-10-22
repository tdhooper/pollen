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
      switch(url.parse(req.url).pathname) {
        case '/save':
          save(req, res);
          break;
        case '/upload':
          upload(req, res);
          break;
        default:
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

var upload = function(req, res) {
  var form = new multiparty.Form({
    autoFiles: true,
    uploadDir: saveLocation
  });

  form.on('file', function(name, file) {
    var filename = path.basename(file.path);
    res.end(filename);
  });

  form.parse(req);
};
