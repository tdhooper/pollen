import Collisions from 'collisions';

const Noise = require('noisejs').Noise;
const vec2 = require('gl-matrix').vec2;
const SimulatedPollenet = require('./simulated-pollenet');


class SimulatedPollen {

  constructor() {
    this.pollen = [];
    this.radius = 20;
    this.collisions = new Collisions();
    this.result = this.collisions.createResult();
    this.noise = new Noise(Math.random());
    this._tick();
  }

  add(source) {
    var position = this.randomPoint(this.radius);
    var size = Math.random() * 2 + 1;
    var particle = this.collisions.createCircle(position[0], position[1], size);
    this.pollen.push(new SimulatedPollenet(source, particle));
  }

  tick(dt) {

    var position = vec2.create();
    var time = + new Date();

    this.pollen.forEach(pollenet => {

      var curl = this.curlNoise(
        pollenet.particle.x * .01,
        pollenet.particle.y * .01,
        time * .0005
      );
      pollenet.particle.x += curl[0] * .05;
      pollenet.particle.y += curl[1] * .05;

      vec2.set(position, pollenet.particle.x, pollenet.particle.y);
      var len = vec2.length(position);
      if (len > this.radius) {
        pollenet.particle.x = (pollenet.particle.x / len) * -this.radius;
        pollenet.particle.y = (pollenet.particle.y / len) * -this.radius;
      }
    });

    this.collisions.update();

    this.pollen.forEach(pollenet => {
      const particle = pollenet.particle;
      const potentials = particle.potentials();

      for(const potential of potentials) {
          if (particle.collides(potential, this.result)) {
              particle.x -= this.result.overlap * this.result.overlap_x;
              particle.y -= this.result.overlap * this.result.overlap_y;
          }
      }
    });
  }

  _tick(last) {
    last = last || performance.now();
    var now = performance.now();
    this.tick(now - last);
    setTimeout(this._tick.bind(this, now), 5);
  }

  randomPoint(radius) {
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    return [r * Math.cos(theta), r * Math.sin(theta)];
  }

  curlNoise(x, y, z) {
    var n1, n2;
    var eps = 0.001;

    n1 = this.noise.simplex3(x, y + eps, z);
    n2 = this.noise.simplex3(x, y - eps, z);
    const a = (n1 - n2) / (2 * eps);

    n1 = this.noise.simplex3(x + eps, y, z);
    n2 = this.noise.simplex3(x - eps, y, z);
    const b = (n1 - n2)/(2 * eps);

    return [a, -b];
  }
}


module.exports = SimulatedPollen;
