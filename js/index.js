var startEditor = require('./editor');
var startGallery = require('./gallery');

if (window.location.search.indexOf('gallery') !== -1) {
  startGallery();
} else {
  startEditor();
}
