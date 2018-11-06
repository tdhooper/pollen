const mat4 = require('gl-matrix').mat4;
const Pollenet = require('./pollenet');


class SimulatedPollenet extends Pollenet {

  constructor(source, particle) {
    super(source);
    this.particle = particle;
    this._model = mat4.identity([]);
  }

  get position() {
    return [this.particle.x, this.particle.y, 0];
  }

  get model() {
    mat4.fromTranslation(
      this._model,
      this.position
    );
    mat4.scale(
      this._model,
      this._model,
      [this.particle.radius, this.particle.radius, this.particle.radius]
    );
    return this._model;
  }

}

module.exports = SimulatedPollenet;
