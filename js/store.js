var objToBlob = require('./send-buffer').objToBlob;
var urlToImg = require('./send-buffer').urlToImg;
var uuidv1 = require('uuid/v1');

var storage = firebase.storage();
var modelsRef = storage.ref().child('models');

var db = firebase.firestore();
var savedRef = db.collection('saved');


function save(sourceObj) {
  var name = uuidv1();
  Promise.all([
    objToBlob(sourceObj.normal).then(
      blob => uploadImage(blob, name + '_normal.png')
    ),
    objToBlob(sourceObj.image).then(
      blob => uploadImage(blob, name + '_image.png')
    ),
    uploadJson(sourceObj.LODs, name + '_mesh.json')
  ]).then(filenames => {
    var data = {
      normal: filenames[0],
      image: filenames[1],
      LODs: filenames[2]
    };
    console.log('submit', name);
    savedRef.doc(name).set(data);
  });
}

function restore(name) {
  return fetch('/saved/' + name + '.json').then(response => {
    return response.text();
  }).then(text => {
    return JSON.parse(text);
  }).then(obj => {
    return Promise.all([
      urlToImg('/saved/' + obj.normal),
      urlToImg('/saved/' + obj.image),
    ]).then(images => {
      obj.LODs = obj.LODs.map(mesh => ({
        positions: regl.buffer(mesh.positions),
        uvs: regl.buffer(mesh.uvs),
        cells: regl.elements(mesh.cells)
      }));
      obj.normal = images[0];
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

function uploadImage(blob, name) {
  return new Promise((resolve, reject) => {
    modelsRef
      .child(name)
      .put(blob, {
        contentType: 'image/png',
      })
      .then(snapshot => {
        resolve(name);
      });
  });
}

function uploadJson(json, name) {
  return new Promise((resolve, reject) => {
    modelsRef
      .child(name)
      .putString(JSON.stringify(json), 'raw', {
        contentType: 'application/json',
      })
      .then(snapshot => {
        resolve(name);
      });
  });
}

module.exports = {
  save: save,
  saved: saved,
  restore: restore
};
