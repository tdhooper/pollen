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
    this._scale = vec3.create();
    this._drawProps = {
      normal: this.normal,
      image: this.image
    };
  }

  get position() {
    return vec3.set(
      this._position,
      this.particle.x,
      this.particle.y,
      0
    );
  }

  setSource(source) {
    this._source = source;
    this._drawProps.normal = this.normal;
    this._drawProps.image = this.image;
  }

  move() {

    var axis = vec3.create();
    var dir = vec3.create();
    var vecy = vec3.fromValues(0, 0, 1);
    var rot = quat.create();

    return function(x, y) {
      vec3.set(dir, x, y, 0);
      this.particle.x += x;
      this.particle.y += y;
      vec3.cross(axis, dir, vecy);
      vec3.normalize(axis, axis);
      var angle = vec3.length(dir) * -2;
      quat.setAxisAngle(rot, axis, angle);
      quat.multiply(this.rotation, this.rotation, rot); // local
      // quat.multiply(this.rotation, rot, this.rotation); // world
    };
  }

  get model() {
    return mat4.fromRotationTranslationScale(
      this._model,
      this.rotation,
      this.position,
      this.scale
    );
  }

  get scale() {
    return vec3.set(
      this._scale,
      this.particle.radius,
      this.particle.radius,
      this.particle.radius
    );
  }

}

module.exports = SimulatedPollenet;
