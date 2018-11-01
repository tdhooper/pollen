var store = require('./store');
const createRegl = require('regl');
const createCamera = require('canvas-orbit-camera');
const mat4 = require('gl-matrix').mat4;
const vec2 = require('gl-matrix').vec2;

import Collisions from 'collisions';

module.exports = function() {

  const canvas = document.body.appendChild(document.createElement('canvas'));
  global.regl = createRegl({
    canvas: canvas,
    attributes: {
      preserveDrawingBuffer: true
    },
    extensions: ['webgl_depth_texture']
  });

  const glm = require('gl-matrix');
  const DrawPollenet = require('./draw-pollenet');
  const Source = require('./source');
  const setupPass = require('./draw/setup-pass');
  const bufferToObj = require('./send-buffer').bufferToObj;
  const setLength = require('./list').setLength;
  const Stats = require('stats.js');
  const dofPass = require('./draw/dof-pass');

  console.log(Collisions);

  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  const camera = createCamera(canvas);
  camera.distance = 200;

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

  const drawPollenet = new DrawPollenet(abcUv, 4);
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
        newPollenet(source);
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
    newPollenet(source);
  };

  function newPollenet(source) {
    var particle = new Particle(randomPoint(radius), randomPoint(.1));
    simulation.add(particle);
    pollen.push({
      particle: particle,
      source: source
    });
  }

  const setupView = regl({
    uniforms: {
      view: () => {
        return camera.view();
      }
    }
  });

  var model = mat4.identity([]);

  var buffer = regl.framebuffer({
    color: regl.texture({
      width: 1024,
      height: 1024
    }),
    depthTexture: true,
  });

  regl.frame((context) => {

    stats.begin();

    regl.clear({
      color: [.9, .9, .9, 1],
      depth: 1,
      framebuffer: buffer
    });
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });
    // camera.rotate([.003,0.002],[0,0]);
    camera.tick();

    context.camera = camera;

    context.proj = mat4.perspective([],
      Math.PI / 10,
      context.viewportWidth / context.viewportHeight,
      0.01,
      1000
    );

    var size = [context.drawingBufferWidth, context.drawingBufferHeight];
    if (buffer.width !== size[0] || buffer.height !== size[1]) {
      buffer.resize(size[0], size[1]);
    }

    setupView(function() {
      pollen.forEach((pollenet, i) => {
        mat4.fromTranslation(model, pollenet.particle.position.concat(0));
        drawPollenet.draw(pollenet.source, model, buffer);
      });
    });

    setupPass(function() {
      dofPass({
        source: buffer,
        depth: buffer.depthStencil
      });
    });

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
