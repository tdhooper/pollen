const mat4 = require('gl-matrix').mat4;
const Pollenet = require('./pollenet');


class SimulatedPollenet extends Pollenet {

  constructor(source, particle) {
    super(source);
    this.particle = particle;
    this._model = mat4.identity([]);
  }

  get model() {
    return mat4.fromTranslation(this._model, this.particle.position.concat(0));
  }
}

module.exports = SimulatedPollenet;
