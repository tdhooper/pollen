var budo = require('budo');
var url = require('url');
var fs = require('fs');
var bodyParser = require('body-parser');
var empty = require('is-empty');
var crypto = require('crypto');
var path = require('path');
var multiparty = require('multiparty');
var util = require('util');
var Router = require('router');


var saveLocation = path.join(__dirname, 'saved');

if ( ! fs.existsSync(saveLocation)){
  fs.mkdirSync(saveLocation);
}


var router = Router();

budo('./js/index.js', {
  live: true,
  stream: process.stdout,
  ssl: true,
  middleware: [
    bodyParser.json(),
    router
  ],
  browserify: {
    plugin: [
      require('esmify')
    ]
  }
});


router.post('/save/:name', function(req, res) {

  var name = req.params.name;

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
});


router.post('/upload', function(req, res) {
  var form = new multiparty.Form({
    autoFiles: true
  });

  form.on('file', function(name, file) {
    var filename = path.join(saveLocation, file.originalFilename);
    fs.renameSync(file.path, filename);
    res.end(file.originalFilename);
  });

  form.parse(req);
});


router.get('/saved', function(req, res) {
  dirType(saveLocation, 'json')
    .then(sortModified)
    .then(files => {
      var names = files.map(file => {
        return path.basename(file).slice(0, -5);
      });
      str = JSON.stringify(names);
      res.end(str);
    });
});


function dirType(dir, type) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        throw reject(err);
      }
      files = files.filter(file => {
        return file.endsWith(type);
      }).map(file => {
        return path.join(dir, file);
      });
      resolve(files);
    });
  });
}


function sortModified(files) {
  return Promise.all(files.map(fileModified)).then(times => {
    return files.map((file, i) => {
      return [file, times[i]];
    }).sort((a, b) => {
      return b[1] - a[1];
    }).map(fileModified => {
      return fileModified[0];
    });
  });
}


function fileModified(file) {
  return new Promise((resolve, reject) => {
    fs.stat(file, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data.mtime.getTime());
    });
  });
}
