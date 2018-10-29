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
    }
  });

  const glm = require('gl-matrix');
  const Pollenet = require('./pollenet');
  const Source = require('./source');
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

  const pollenet = new Pollenet(abcUv);
  var sources = [];
  var limit = 50;

  store.saved().then(saved => {
    saved = saved.slice(0, limit);
    Promise.all(saved.map(store.restore)).then(restored => {
      restored.forEach(obj => {
        var source = new Source();
        source.fromObj(obj);
        sources.push(source);
      });
      sources = setLength(sources, limit);
    });
  });

  var channel = new BroadcastChannel('pollen');

  channel.onmessage = function(evt) {
    var sourceObj = evt.data;

    store.save(sourceObj);

    var source = new Source();
    source.fromObj(sourceObj);
    sources.push(source);
  };

  const setupView = regl({
    uniforms: {
      view: () => {
        return camera.view();
      }
    }
  });

  var model = mat4.identity([]);

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
      sources.forEach((source, i) => {
        // i += 10;
        var radius = i / limit * 1.5;
        var angle = i * Math.PI * (3 - Math.sqrt(5));
        var v = [Math.sin(angle) * radius, Math.cos(angle) * radius, 0];
        mat4.fromTranslation(model, v);
        mat4.scale(model, model, [.1,.1,.1]);
        pollenet.draw(source, model);
      });
    });

    stats.end();

  });
};
