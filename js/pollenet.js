const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;


class Pollenet {

  constructor(source, offset) {
    this._source = source;
    this._model = mat4.fromTranslation([], [offset,0,0]);
    this._position = vec3.create();
    this.pickLOD = this.pickLOD();
    this._drawProps = {
      height: this.height,
      normal: this.normal,
      image: this.image
    };
  }

  drawProps(view, viewportWidth, viewportHeight) {
    var lod = this.pickLOD(view, viewportWidth, viewportHeight);
    this._drawProps.positions = lod.mesh.positions;
    this._drawProps.uvs = lod.mesh.uvs;
    this._drawProps.cells = lod.mesh.cells;
    this._drawProps.lodLevel = lod.level;
    this._drawProps.model = this.model;
    return this._drawProps;
  }

  get source() {
    return this._source;
  }

  setSource(source) {
    this._source = source;
    this._drawProps.height = this.height;
    this._drawProps.normal = this.normal;
    this._drawProps.image = this.image;
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

  get normal() {
    return this.source.normal;
  }

  get image() {
    return this.source.image;
  }

  pickLOD() {

    var viewInv = mat4.create();
    var camPos = vec3.create();
    var modelPos = vec3.create();
    var modelScale = mat4.create();
    var result = {};

    return function(view, viewportWidth, viewportHeight) {
      mat4.invert(viewInv, view);
      mat4.getTranslation(camPos, viewInv);

      mat4.getTranslation(modelPos, this.model);
      var dist = vec3.dist(camPos, modelPos);

      var vFOV = Math.PI / 10;
      var vHeight = 2 * Math.tan( vFOV / 2 ) * dist;
      var aspect = viewportWidth / viewportHeight;

      mat4.getScaling(modelScale, this.model);
      var scale = modelScale[0] * 2;
      var fraction = scale / vHeight;

      fraction = Math.pow(fraction * 2., .5) - .2;
      fraction = Math.max(0, fraction);

      var lod = Math.round(fraction * (this.source.LODs.length - 1));
      lod = Math.min(lod, this.source.LODs.length - 1);

      result.mesh = this.source.LODs[lod];
      result.level = lod;

      return result;
    };
  }

}

module.exports = Pollenet;
