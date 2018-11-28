
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

  var limit = Math.round(2500 * .6);
  var radius = 7;
  var simulatedPollen = new SimulatedPollen(camera, radius);

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

  var drawPollen2 = function(context) {
    var props = context.visible.map((pollenet, i) => {
      var lod = drawPollenet.pickLOD(
        pollenet.source.LODs,
        pollenet.model,
        camera._view,
        context.viewportWidth,
        context.viewportHeight
      );
      return {
        positions: lod.mesh.positions,
        uvs: lod.mesh.uvs,
        cells: lod.mesh.cells,
        lodLevel: lod.level,
        model: pollenet.model,
        image: pollenet.image,
        normal: pollenet.normal
      };
    });
    drawPollenet.draw(props);
  };

  var drawPollen = function(context) {
    drawPollenet.setup({
      camera: camera,
      viewport: {
        x: 0,
        y: 0,
        width: context.viewportWidth,
        height: context.viewportHeight
      }
    }, drawPollen2);
  };


  regl.frame((context) => {
    TWEEN.update();
    simulatedPollen.tick();

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

    var visible = simulatedPollen.visible();
    context.visible = visible;
    if (visible.length) {
      compositor.buffer.use(drawPollen);
    }

    compositor.drawPost(context);
  });
};
