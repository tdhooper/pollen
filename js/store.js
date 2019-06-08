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
      LODs: filenames[2],
      created: firebase.firestore.FieldValue.serverTimestamp(),
    };
    console.log('submit', name);
    savedRef.doc(name).set(data);
  });
}

function restore(obj) {
  return Promise.all([
    downloadUrl(obj.normal).then(urlToImg),
    downloadUrl(obj.image).then(urlToImg),
    downloadUrl(obj.LODs).then(urlToJson),
  ]).then(assets => {
    obj.normal = assets[0];
    obj.image = assets[1];
    obj.LODs = assets[2].map(mesh => ({
      positions: regl.buffer(mesh.positions),
      uvs: regl.buffer(mesh.uvs),
      cells: regl.elements(mesh.cells)
    }));
    return obj;
  });
}

function saved(limit) {
  return savedRef
    .orderBy('created', 'desc')
    .limit(limit)
    .get()
    .then(snapshot => {
      return snapshot.docs.map(doc => doc.data());
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

function urlToJson(url) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.onload = function(event) {
      resolve(xhr.response);
    };
    xhr.open('GET', url);
    xhr.send();
  });
}

function downloadUrl(name) {
  return modelsRef
    .child(name)
    .getDownloadURL();
}

module.exports = {
  save: save,
  saved: saved,
  restore: restore
};
