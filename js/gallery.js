var store = require('./store');
const createRegl = require('regl');
const createCamera = require('canvas-orbit-camera');


module.exports = function() {

  const canvas = document.body.appendChild(document.createElement('canvas'));
  global.regl = createRegl({
    canvas: canvas,
    attributes: {
      preserveDrawingBuffer: true
    }
  });

  const glm = require('gl-matrix');
  const Pollenet = require('./pollenet');
  const Source = require('./source');
  const setupPass = require('./draw/setup-pass');
  const bufferToObj = require('./send-buffer').bufferToObj;

  const camera = createCamera(canvas);
  camera.distance = 10;

  var resize = function() {
    var width = document.body.clientWidth;
    var height = document.body.clientHeight;
    canvas.width = width;
    canvas.height = height;
  };

  window.addEventListener('resize', resize, false);

  resize();

  var abcUv = [
    [1, 1],
    [0, 1],
    [1, 0]
  ];

  const pollenet = new Pollenet(abcUv);
  const source = new Source();

  store.saved().then(saved => {
    store.restore(saved[0]).then(obj => {
      source.fromImgObj(obj);
    });
  });

  var channel = new BroadcastChannel('pollen');

  channel.onmessage = function(evt) {
    var sourceObj = evt.data;
    source.fromObj(sourceObj);
    store.save(sourceObj);
  };

  const setupView = regl({
    uniforms: {
      view: () => {
        return camera.view();
      }
    }
  });

  regl.frame((context) => {
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
      stencil: 0
    });
    camera.rotate([.003,0.002],[0,0]);
    camera.tick();

    setupView(function() {
      pollenet.draw(source);
    });
  });
};
