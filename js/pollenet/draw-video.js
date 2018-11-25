const mat4 = require('gl-matrix').mat4;
const DrawCore = require('./draw-core');


class DrawVideo extends DrawCore {

  constructor(wythoff) {

    super(wythoff);

    var parentDraw = this.draw;
    var draw = regl({
      viewport: {
        x: regl.prop('viewport.x'),
        y: regl.prop('viewport.y'),
        width: regl.prop('viewport.width'),
        height: regl.prop('viewport.height'),
      },
      vert: `
        precision mediump float;
        uniform mat4 proj;
        uniform mat4 model;
        uniform mat4 view;
        uniform sampler2D heightMap;
        uniform mat3 normalMatrix;
        attribute vec3 position;
        attribute vec2 uv;
        attribute float instance;
        attribute vec4 iModelRow0;
        attribute vec4 iModelRow1;
        attribute vec4 iModelRow2;
        attribute vec4 iModelRow3;
        attribute vec3 iModelNormalRow0;
        attribute vec3 iModelNormalRow1;
        attribute vec3 iModelNormalRow2;
        varying vec2 vuv;
        varying float height;
        varying mat3 iModelNormal;
        varying vec2 flipNormal;

        float getHeight(vec2 uv) {
          vec3 color = texture2D(heightMap, uv).rgb;
          float height = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
          height = mix(1./3., 1., height);
          return height;
        }

        void main () {
          vuv = uv;

          vec3 pos = position;
          vec4 pos4 = vec4(pos, 1);

          mat4 iModel = mat4(
            iModelRow0,
            iModelRow1,
            iModelRow2,
            iModelRow3
          );

          iModelNormal = mat3(
            iModelNormalRow0,
            iModelNormalRow1,
            iModelNormalRow2
          );

          iModelNormal = normalMatrix * iModelNormal;

          flipNormal = pos.xy;

          height = getHeight(vuv);
          pos4 = vec4(normalize((iModel * pos4).xyz) * height, 1);

          // pos4 = iModel * pos4;
          // pos4 = vec4(normalize(pos4.xyz), 1);

          gl_Position = proj * view * model * pos4;
        }`,
      uniforms: {
        heightMap: regl.prop('pollenet.height')
      }
    });

    this.draw = function(props) {
      parentDraw(props, context => {
        draw(props);
      });
    };
  }
}


module.exports = DrawVideo;
