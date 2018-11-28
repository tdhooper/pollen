const mat4 = require('gl-matrix').mat4;
const quat = require('gl-matrix').quat;
const vec3 = require('gl-matrix').vec3;
const Pollenet = require('./pollenet');


class SimulatedPollenet extends Pollenet {

  constructor(source, particle) {
    super(source);
    this.particle = particle;
    this._model = mat4.identity([]);
    this.rotation = quat.create();
    this.move = this.move();
  }

  get position() {
    return [this.particle.x, this.particle.y, 0];
  }

  move(x, y) {

    var axis = vec3.create();
    var y = vec3.fromValues(0, 0, 1);
    var rot = quat.create();

    return function(x, y) {
      this.particle.x += x;
      this.particle.y += y;
      vec3.cross(axis, dir, y);
      vec3.normalize(axis, axis);
      var angle = vec3.length(dir) * -2;
      quat.setAxisAngle(rot, axis, angle);
      quat.multiply(this.rotation, this.rotation, rot); // local
      // quat.multiply(this.rotation, rot, this.rotation); // world
    }
  }

  get model() {
    mat4.fromRotationTranslationScale(
      this._model,
      this.rotation,
      this.position,
      [this.particle.radius, this.particle.radius, this.particle.radius]
    );
    return this._model;
  }

}

module.exports = SimulatedPollenet;
