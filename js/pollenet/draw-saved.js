const DrawCore = require('./draw-core');


class DrawSaved extends DrawCore {

  constructor(wythoff) {

    super(wythoff);

    var parentDraw = this.draw;
    var draw = regl({
      vert: `
        precision mediump float;
        uniform mat4 proj;
        uniform mat4 model;
        uniform mat4 view;
        uniform mat3 normalMatrix;
        attribute vec3 position;
        attribute vec2 uv;
        attribute vec3 normal;
        attribute float instance;
        attribute vec4 iModelRow0;
        attribute vec4 iModelRow1;
        attribute vec4 iModelRow2;
        attribute vec4 iModelRow3;
        attribute vec3 iModelNormalRow0;
        attribute vec3 iModelNormalRow1;
        attribute vec3 iModelNormalRow2;
        varying vec2 vuv;
        varying mat3 iModelNormal;
        varying vec2 flipNormal;

        void main () {
          vuv = uv;

          iModelNormal = mat3(
            iModelNormalRow0,
            iModelNormalRow1,
            iModelNormalRow2
          );

          iModelNormal = normalMatrix * iModelNormal;

          vec3 pos = position;

          mat4 iModel = mat4(
            iModelRow0,
            iModelRow1,
            iModelRow2,
            iModelRow3
          );

          // TODO: this doesn't work, we'll need to store it on the UV then abs it
          flipNormal = pos.xy;

          vec4 pos4 = vec4(pos, 1);
          pos4 = iModel * pos4;

          gl_Position = proj * view * model * pos4;
        }`,
      attributes: {
        normal: regl.context('mesh.normals')
      }
    });

    this.draw = function(props) {
      parentDraw(props, draw);
    };
  }
}


module.exports = DrawSaved;
