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

  constructor(camera) {
    this.camera = camera;
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
    this.pollen.push(oldest);

    var radius = oldest.particle.radius;

    var tweenOut = new TWEEN.Tween(oldest.particle)
      .to({ radius: 0 }, 500);

    var tweenIn = new TWEEN.Tween(oldest.particle)
      .to({ radius: radius }, 5000)
      .easing(TWEEN.Easing.Elastic.Out);

    tweenOut.onComplete(_ => {
      oldest.source = source;
      tweenIn.start();
    });
    tweenOut.start();

    return oldest;
  }

  focusOn(pollenet) {
    this.focus = pollenet;
  }

  visible() {
    var tFrustumMat = new Matrix4().fromArray(
      mat4.multiply([], this.camera.proj, this.camera.view())
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

    var offset = this.camera.center;
    if (this.focus) {
      var diff = vec2.sub([], this.focus.position, offset);
      vec2.scale(diff, diff, 0.1);
      vec2.add(offset, offset, diff);
    }

    this.pollen.forEach(pollenet => {

      var curl = this.curlNoise(
        pollenet.particle.x * .2,
        pollenet.particle.y * .2,
        time * .0001
      );
      var r = 1 - pollenet.particle.radius / this.maxSize;
      r = r * .5 + .5;
      pollenet.move([
        curl[0] * .01 * r,
        curl[1] * .01 * r,
        0
      ]);

      vec2.set(
        position,
        pollenet.particle.x - offset[0],
        pollenet.particle.y - offset[1]
      );
      var len = vec2.length(position);
      if (len > this.radius) {
        pollenet.particle.x = (position[0] / len) * -this.radius + offset[0];
        pollenet.particle.y = (position[1] / len) * -this.radius + offset[1];
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
