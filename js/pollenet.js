const mat4 = require('gl-matrix').mat4;


class Pollenet {

  constructor(source) {
    this.source = source;
    this._model = mat4.identity([]);
  }

  get model() {
    return this._model;
  }

  get height() {
    return this.source.height;
  }

  get image() {
    return this.source.image;
  }
}

module.exports = Pollenet;
