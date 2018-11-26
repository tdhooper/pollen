
module.exports = function() {

  require('./setup-regl');

  const createCamera = require('canvas-orbit-camera');
  const mat4 = require('gl-matrix').mat4;
  const vec3 = require('gl-matrix').vec3;
  const quat = require('gl-matrix').quat;
  const polyhedra = require('polyhedra');
  const TWEEN = require('@tweenjs/tween.js');
  const AutoCam = require('./autocam');
  const SimulatedPollen = require('./simulated-pollen');
  const DrawPollenet = require('./pollenet/draw-saved');
  const Source = require('./source');
  const store = require('./store');
  const setLength = require('./list').setLength;
  const DofBlur = require('./process/dof-blur');
  const BackBlur = require('./process/back-blur');
  const Compositor = require('./process/compositor');
  const wythoffModels = require('./geometry/wythoff-models');

  global.TWEEN = TWEEN;

  const camera = createCamera(regl._gl.canvas);
  camera.distance = 5;
  quat.rotateX(camera.rotation, camera.rotation, .8);
  camera._projection = mat4.create();
  camera._view = mat4.create();
  camera.projection = (matrix, width, height) => {
    return mat4.perspective(matrix,
      Math.PI / 10,
      width / height,
      0.01,
      1000
    );
  };

  var autoCam = new AutoCam(camera);

  var abcUv = [
    [0, 0],
    [0, 1],
    [1, 0]
  ];
  var abc = [
    [0, 0, 1],
    [1, 0, 0],
    [-1, 0, 0]
  ];

  var poly = polyhedra.platonic.Tetrahedron;
  var wythoff = wythoffModels(poly, abc);

  const drawPollenet = new DrawPollenet(wythoff);
  const dofBlur = new DofBlur(camera);
  const backBlur = new BackBlur({
    zoom: 0,
    fade: 1.01,
    magnitude: 5
  });
  const compositor = new Compositor();
  compositor.addPre(backBlur);
  compositor.addPost(dofBlur);

  var limit = 2500;
  var simulatedPollen = new SimulatedPollen(camera);

  store.saved().then(saved => {
    saved = saved.slice(0, limit);
    Promise.all(saved.map(store.restore)).then(restored => {
      var sources = restored.map(obj => {
        var source = new Source(wythoff);
        source.fromObj(obj);
        return source;
      });
      sources = setLength(sources, limit);
      if ( ! sources) {
        return;
      }
      sources.forEach(source => {
        addPollenet(source);
      });
    });
  });

  var channel = new BroadcastChannel('pollen');
  channel.onmessage = function(evt) {
    var sourceObj = evt.data;
    store.save(sourceObj);
    var source = new Source();
    source.fromObj(sourceObj);
    addPollenet(source);
  };

  function addPollenet(source) {
    if (simulatedPollen.pollen.length < limit) {
      simulatedPollen.add(source);
    } else {
      var pollenet = simulatedPollen.replaceOldest(source);
      autoCam.focusOn(pollenet);
    }
  }

  regl.frame((context) => {
    TWEEN.update();

    compositor.drawPre(context);
    compositor.clear(false);

    autoCam.tick();
    camera.tick();
    camera.projection(
      camera._projection,
      context.viewportWidth,
      context.viewportHeight
    );
    camera.view(camera._view);

    simulatedPollen.visible().forEach((pollenet, i) => {
      drawPollenet.draw({
        pollenet: pollenet,
        camera: camera,
        destination: compositor.buffer,
        viewport: {
          x: 0,
          y: 0,
          width: context.viewportWidth,
          height: context.viewportHeight
        }
      });
    });

    compositor.drawPost(context);
  });
};
