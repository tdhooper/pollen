var objToBlob = require('./send-buffer').objToBlob;

function save(sourceObj) {
  Promise.all([
    objToBlob(sourceObj.height).then(upload),
    objToBlob(sourceObj.image).then(upload)
  ]).then(filenames => {
    var data = {
      height: filenames[0],
      image: filenames[1],
    };
    return submit(data);
  });
}

function upload(blob) {
  var form = new FormData();
  form.append('image', blob, "image.png");
  var f = fetch('/upload', {
    method: 'POST',
    body: form
  });
  return f.then(response => {
    return response.text();
  });
}

function submit(data) {
  var form = new FormData();
  var f = fetch('/save', {
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
  save: save
};
