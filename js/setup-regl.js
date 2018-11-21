const createRegl = require('regl');

const canvas = document.body.appendChild(document.createElement('canvas'));
global.regl = createRegl({
  canvas: canvas,
  attributes: {
    preserveDrawingBuffer: true
  },
  extensions: [
    'webgl_depth_texture',
    'angle_instanced_arrays',
    'oes_standard_derivatives'
  ]
});

var resize = function() {
  var width = document.body.clientWidth;
  var height = document.body.clientHeight;
  canvas.width = width;
  canvas.height = height;
};

window.addEventListener('resize', resize, false);

resize();

var noop = function(evt) {
  evt.preventDefault();
};

canvas.addEventListener('touchstart', noop, false);
canvas.addEventListener('touchmove', noop, false);
canvas.addEventListener('touchend', noop, false);
