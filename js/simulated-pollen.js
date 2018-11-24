import Collisions from 'collisions';

import { Matrix4 } from 'three/src/math/Matrix4';
import { Frustum } from 'three/src/math/Frustum';
import { Vector3 } from 'three/src/math/Vector3';
import { Sphere } from 'three/src/math/Sphere';

const Noise = require('noisejs').Noise;
const vec2 = require('gl-matrix').vec2;
const mat4 = require('gl-matrix').mat4;

const SimulatedPollenet = require('./simulated-pollenet');


class SimulatedPollen {

  constructor() {
    this.pollen = [];
    this.radius = 10;
    this.collisions = new Collisions();
    this.result = this.collisions.createResult();
    this.noise = new Noise(Math.random());
    this.minSize = 0.1;
    this.maxSize = .7;
    this.focus = undefined;
    this._tick();
  }

  add(source) {
    var position = this.randomPoint(this.radius);
    var size = Math.pow(Math.random(), 10);
    var radius = this.minSize + size * (this.maxSize - this.minSize);
    var particle = this.collisions.createCircle(position[0], position[1], radius);
    this.pollen.push(new SimulatedPollenet(source, particle));
  }

  replaceOldest(source) {
    var oldest = this.pollen.shift();
    oldest.source = source;
    this.pollen.push(oldest);
    return oldest;
  }

  focusOn(pollenet) {
    this.focus = pollenet;
  }

  visible(camera) {
    var tFrustumMat = new Matrix4().fromArray(
      mat4.multiply([], camera.proj, camera.view())
    );
    var frustum = new Frustum();
    frustum.setFromMatrix(tFrustumMat);
    var point = new Vector3();
    var v = this.pollen.filter(pollenet => {
      var a = 0;
      frustum.planes.forEach(plane => {
        point.fromArray(pollenet.position);
        var sphere = new Sphere(point, -pollenet.particle.radius);
        var dist = plane.distanceToSphere(sphere);
        if (dist < 0) {
          a = 1;
        }
      });
      return a == 0;
    });
    return v;
  }

  tick(dt) {

    var position = vec2.create();
    var time = + new Date();
    var focusMove = vec2.create();
    if (this.focus) {
      vec2.copy(focusMove, this.focus.position);
    }
    vec2.scale(focusMove, focusMove, -0.1);

    this.pollen.forEach(pollenet => {

      var curl = this.curlNoise(
        pollenet.particle.x * .2,
        pollenet.particle.y * .2,
        time * .0001
      );
      var r = 1 - pollenet.particle.radius / this.maxSize;
      r = r * .5 + .5;
      pollenet.move([
        curl[0] * .01 * r + focusMove[0],
        curl[1] * .01 * r + focusMove[1],
        0
      ]);

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

      for (const potential of potentials) {
        if (particle.collides(potential, this.result)) {
          pollenet.move([
            -this.result.overlap * this.result.overlap_x * .1,
            -this.result.overlap * this.result.overlap_y * .1,
            0
          ]);
        }
      }
    });
  }

  _tick(last) {
    last = last || performance.now();
    var now = performance.now();
    this.tick(now - last);
    requestAnimationFrame(this._tick.bind(this, now));
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
