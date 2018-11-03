
module.exports = function() {

  require('./setup-regl');

  const createCamera = require('canvas-orbit-camera');
  const mat4 = require('gl-matrix').mat4;
  const SimulatedPollen = require('./simulated-pollen');
  const DrawPollenet = require('./draw-pollenet');
  const Source = require('./source');
  const store = require('./store');
  const setLength = require('./list').setLength;
  const Stats = require('stats.js');
  const DofPass = require('./draw/dof-pass');
  const Compositor = require('./compositor');


  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  const camera = createCamera(regl._gl.canvas);
  camera.distance = 100;
  camera.projection = (width, height) => {
    return mat4.perspective([],
      Math.PI / 10,
      width / height,
      0.01,
      1000
    );
  };

  var abcUv = [
    [1, 1],
    [0, 1],
    [1, 0]
  ];
  const drawPollenet = new DrawPollenet(abcUv, 1);
  const dofPass = new DofPass(camera);
  const compositor = new Compositor();
  compositor.addPost(dofPass);

  var limit = 1200;
  var simulatedPollen = new SimulatedPollen();

  store.saved().then(saved => {
    saved = saved.slice(0, limit);
    Promise.all(saved.map(store.restore)).then(restored => {
      var sources = restored.map(obj => {
        var source = new Source();
        source.fromObj(obj);
        return source;
      });
      sources = setLength(sources, limit);
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
    simulatedPollen.add(source);
  }

  regl.frame((context) => {
    stats.begin();
    compositor.clear();

    camera.tick();

    simulatedPollen.pollen.forEach((pollenet, i) => {
      drawPollenet.draw({
        pollenet: pollenet,
        camera: camera,
        // destination: compositor.buffer
      });
    });

    // compositor.draw(context);
    stats.end();
  });
};
