var objToBlob = require('./send-buffer').objToBlob;
var urlToImg = require('./send-buffer').urlToImg;
var uuidv1 = require('uuid/v1');

function save(sourceObj) {
  name = uuidv1();
  Promise.all([
    objToBlob(sourceObj.height).then(
      blob => upload(blob, name + '_height.png')
    ),
    objToBlob(sourceObj.image).then(
      blob => upload(blob, name + '_image.png')
    )
  ]).then(filenames => {
    var data = {
      height: filenames[0],
      image: filenames[1],
      LODs: sourceObj.LODs
    };
    return submit(data, name);
  });
}

function restore(name) {
  return fetch('/saved/' + name + '.json').then(response => {
    return response.text();
  }).then(text => {
    return JSON.parse(text);
  }).then(obj => {
    return Promise.all([
      urlToImg('/saved/' + obj.height),
      urlToImg('/saved/' + obj.image),
    ]).then(images => {
      obj.height = images[0];
      obj.image = images[1];
      return obj;
    });
  });
}

function saved() {
  return fetch('/saved').then(response => {
    return response.text();
  }).then(text => {
    return JSON.parse(text);
  });
}

function upload(blob, name) {
  var form = new FormData();
  form.append('image', blob, name);
  var f = fetch('/upload', {
    method: 'POST',
    body: form
  });
  return f.then(response => {
    return response.text();
  });
}

function submit(data, name) {
  var form = new FormData();
  var f = fetch('/save/' + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return f.then(response => {
    return response.text();
  });
}

module.exports = {
  save: save,
  saved: saved,
  restore: restore
};
