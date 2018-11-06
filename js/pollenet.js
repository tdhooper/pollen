const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;


class Pollenet {

  constructor(source) {
    this.source = source;
    this._model = mat4.identity([]);
    this._position = vec3.create();
  }

  get position() {
    return this._position;
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
