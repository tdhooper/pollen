const mat4 = require('gl-matrix').mat4;
const DrawCore = require('./draw-core');


class DrawVideo extends DrawCore {

  constructor(poly, abc) {

    super(poly, abc);

    var invSpecial = mat4.invert([], this.special);

    var parentDraw = this.draw;
    var draw = regl({
      vert: `
        precision mediump float;
        uniform mat4 proj;
        uniform mat4 model;
        uniform mat4 view;
        uniform sampler2D heightMap;
        uniform mat4 special;
        uniform mat4 invSpecial;
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
        varying vec3 vnormal;
        varying mat3 vTBN;

        attribute vec2 barycentric;
        varying vec2 b;

        float getHeight(vec2 uv) {
          float height = texture2D(heightMap, uv).r;
          height = mix(.5, 1., height);
          return height;
        }

        vec3 getPosAt(vec4 pos4, vec2 uv, vec2 offset) {
          float dir = sign(pos4.x);
          pos4 = special * (pos4 + vec4(offset.x, 0, offset.y, 0));
          offset.x *= dir;
          float height = getHeight(uv + offset);
          pos4 = vec4(normalize(pos4.xyz) * height, 1);
          pos4 = invSpecial * pos4;
          return pos4.xyz;
        }

        vec3 getNormal(vec4 pos4, vec2 uv) {
          float eps = .01;
          vec3 p = getPosAt(pos4, uv, vec2(0));
          vec3 x = getPosAt(pos4, uv, vec2(eps,0));
          vec3 y = getPosAt(pos4, uv, vec2(0,eps));

          vec3 t = normalize(p - x);
          vec3 b = normalize(p - y);

          vec3 normal = normalize(cross(b, t));
          return normal;
        }

        void main () {
          b = barycentric;
          vuv = uv;

          height = getHeight(vuv);

          vec3 pos = position;
          vec4 pos4 = vec4(pos, 1);

          mat4 iModel = mat4(
            iModelRow0,
            iModelRow1,
            iModelRow2,
            iModelRow3
          );

          mat3 iModelNormal = mat3(
            iModelNormalRow0,
            iModelNormalRow1,
            iModelNormalRow2
          );

          vnormal = normalize(getNormal(pos4, vuv));
          vnormal = normalize(iModelNormal * vnormal);

          pos4 = vec4(normalize((iModel * pos4).xyz) * height, 1);
          
          gl_Position = proj * view * model * pos4;
        }`,
      uniforms: {
        heightMap: function(context, props) {
          return props.pollenet.height;
        },
        special: this.special,
        invSpecial: invSpecial
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
