var store = require('./store');
const createRegl = require('regl');
const createCamera = require('canvas-orbit-camera');
const mat4 = require('gl-matrix').mat4;

module.exports = function() {

  const canvas = document.body.appendChild(document.createElement('canvas'));
  global.regl = createRegl({
    canvas: canvas,
    attributes: {
      preserveDrawingBuffer: true
    },
    extensions: [
      'angle_instanced_arrays'
    ]
  });

  const glm = require('gl-matrix');
  const MultiPollenet = require('./multi-pollenet');
  const MultiSource = require('./multi-source');
  const setupPass = require('./draw/setup-pass');
  const bufferToObj = require('./send-buffer').bufferToObj;
  const setLength = require('./list').setLength;
  const Stats = require('stats.js');

  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

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

  const limit = 50;
  const multiPollenet = new MultiPollenet(abcUv, limit);
  const multiSource = new MultiSource(limit, 128);

  store.saved().then(saved => {
    saved = saved.slice(0, limit);
    Promise.all(saved.map(store.restore)).then(restored => {
      restored = setLength(restored, limit);
      restored.forEach(obj => {
        multiSource.add(obj);
      });
    });
  });

  var channel = new BroadcastChannel('pollen');

  channel.onmessage = function(evt) {
    var sourceObj = evt.data;
    store.save(sourceObj);
    multiSource.add(sourceObj);
  };

  const setupView = regl({
    uniforms: {
      view: () => {
        return camera.view();
      }
    }
  });

  var models = Array(limit).fill([]).map((model, i) => {
    var radius = i / limit * 1.5;
    var angle = i * Math.PI * (3 - Math.sqrt(5));
    var v = [Math.sin(angle) * radius, Math.cos(angle) * radius, 0];
    mat4.fromTranslation(model, v);
    mat4.scale(model, model, [.1,.1,.1]);
    return model;
  });

  console.log(mat4.fromScaling([], [2,2,2]));

  regl.frame((context) => {

    stats.begin();

    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
      stencil: 0
    });
    // camera.rotate([.003,0.002],[0,0]);
    camera.tick();

    setupView(function() {
      multiPollenet.draw(multiSource, models);
    });

    stats.end();

  });
};

/*

  create multiple pollenets
  each has two textures
  share geometry?
  .. needs a texture map, as you can't use a texture as an instance attribute

  pollet.draw needs to take a matrix


*/