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
  var limit = 5;

  store.saved().then(saved => {
    saved = saved.slice(0, limit);
    Promise.all(saved.map(store.restore)).then(restored => {
      restored.forEach(obj => {
        var source = new Source();
        source.fromObj(obj);
        sources.push(source);
      });

      var len = sources.length;
      var remain = limit - sources.length;
      if (remain < 1) {
        return;
      }
      for (var i = 0; i < remain; i++) {
        sources[len - 1 + i] = sources[i];
      }
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
  });
};

/*

  create multiple pollenets
  each has two textures
  share geometry?
  .. needs a texture map, as you can't use a texture as an instance attribute

  pollet.draw needs to take a matrix


*/