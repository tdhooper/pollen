var store = require('./store');
const createCamera = require('canvas-orbit-camera');
const mat4 = require('gl-matrix').mat4;
const vec2 = require('gl-matrix').vec2;

import Collisions from 'collisions';

module.exports = function() {

  require('./setup-regl');

  const SimulatedPollenet = require('./simulated-pollenet');
  const DrawPollenet = require('./draw-pollenet');
  const Source = require('./source');
  const bufferToObj = require('./send-buffer').bufferToObj;
  const setLength = require('./list').setLength;
  const Stats = require('stats.js');
  const DofPass = require('./draw/dof-pass');
  const Compositor = require('./compositor');

  console.log(Collisions);

  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  const camera = createCamera(regl._gl.canvas);
  camera.distance = 200;
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
  const drawPollenet = new DrawPollenet(abcUv, 4);
  const dofPass = new DofPass(camera);
  const compositor = new Compositor();
  compositor.addPost(dofPass);

  var pollen = [];
  var limit = 100;
  var radius = 50;
  var simulation = new Simulation(radius);

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

  simulation.start();

  var channel = new BroadcastChannel('pollen');
  channel.onmessage = function(evt) {
    var sourceObj = evt.data;
    store.save(sourceObj);
    var source = new Source();
    source.fromObj(sourceObj);
    addPollenet(source);
  };

  function addPollenet(source) {
    var particle = new Particle(randomPoint(radius), randomPoint(.1));
    simulation.add(particle);
    pollen.push(new SimulatedPollenet(source, particle));
  }

  regl.frame((context) => {
    stats.begin();
    compositor.clear();

    camera.tick();

    pollen.forEach((pollenet, i) => {
      drawPollenet.draw({
        pollenet: pollenet,
        camera: camera,
        destination: compositor.buffer
      });
    });

    compositor.draw(context);
    stats.end();
  });
};


function randomPoint(radius) {
  const r = radius * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}


class Particle {

  constructor(position, vector) {
    this.position = position;
    this.vector = vector;
  }
}

class Simulation {

  constructor(radius) {
    this.radius = radius;
    this.particles = [];
  }

  start() {
    this._tick();
  }

  add(particle) {
    this.particles.push(particle);
  }

  tick(dt) {

    var maxSpeed = .2;

    this.particles.forEach(a => {
      this.particles.forEach(b => {
        var direction = vec2.sub([], a.position, b.position);
        var distance = vec2.length(direction);
        vec2.normalize(direction, direction);
        var force = Math.pow(Math.max(0, 10 - distance), 1) * .001;
        vec2.scaleAndAdd(a.vector, a.vector, direction, force);
      });

      vec2.scale(a.vector, a.vector, Math.min(maxSpeed / vec2.length(a.vector), 1));

      if (vec2.length(a.position) > this.radius) {
        vec2.normalize(a.vector, a.position);
        vec2.scale(a.vector, a.vector, 5);
        vec2.scale(a.position, a.position, -1);
      }

      vec2.scaleAndAdd(a.position, a.position, a.vector, dt * .05);
    });
  }

  _tick(last) {
    last = last || performance.now();
    var now = performance.now();
    this.tick(now - last);
    setTimeout(this._tick.bind(this, now), 5);
  }
}
