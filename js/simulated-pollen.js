const vec2 = require('gl-matrix').vec2;
const SimulatedPollenet = require('./simulated-pollenet');


class SimulatedPollen {

  constructor() {
    this.pollen = [];
    this.radius = 50;
    this.simulation = new Simulation(this.radius);
    this.simulation.start();
  }

  add(source) {
    var position = this.randomPoint(this.radius);
    var vector = this.randomPoint(.1);
    var particle = new Particle(position, vector);
    this.simulation.add(particle);
    this.pollen.push(new SimulatedPollenet(source, particle));
  }

  randomPoint(radius) {
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    return [r * Math.cos(theta), r * Math.sin(theta)];
  }
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


module.exports = SimulatedPollen;
