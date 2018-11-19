const DrawCore = require('./draw-core');


class DrawSaved extends DrawCore {

  constructor(poly, abc) {

    super(poly, abc);

    var parentDraw = this.draw;
    var draw = regl({
      vert: `
        precision mediump float;
        uniform mat4 proj;
        uniform mat4 model;
        uniform mat4 view;
        attribute vec3 position;
        attribute vec2 uv;
        attribute float instance;
        attribute vec4 iModelRow0;
        attribute vec4 iModelRow1;
        attribute vec4 iModelRow2;
        attribute vec4 iModelRow3;
        varying vec2 vuv;
        varying vec3 vnormal;

        void main () {
          vuv = uv;
          vnormal = vec3(1,0,0);

          vec3 pos = position;

          mat4 iModel = mat4(
            iModelRow0,
            iModelRow1,
            iModelRow2,
            iModelRow3
          );

          vec4 pos4 = vec4(pos, 1);
          pos4 = iModel * pos4;

          gl_Position = proj * view * model * pos4;
        }`,
    });

    this.draw = function(props) {
      parentDraw(props, draw);
    };
  }
}


module.exports = DrawSaved;
