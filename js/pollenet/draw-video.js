const mat4 = require('gl-matrix').mat4;
const DrawCore = require('./draw-core');


class DrawVideo extends DrawCore {

  constructor(poly, abc) {

    super(poly, abc);

    var scale = mat4.getScaling([], this.models[0]);

    var parentDraw = this.draw;
    var draw = regl({
      vert: `
        precision mediump float;
        uniform mat4 proj;
        uniform mat4 model;
        uniform mat4 view;
        uniform vec3 uvScale;
        uniform sampler2D heightMap;
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
        attribute vec3 iA;
        attribute vec3 iB;
        attribute vec3 iC;
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

        vec3 getNormalMap(vec2 uv) {
          float scale = .1;
          float eps = .05;
          float xp = getHeight(uv + vec2(eps / uvScale.z,0));
          float xn = getHeight(uv + vec2(-eps / uvScale.z,0));
          float yp = getHeight(uv + vec2(0,eps / uvScale.x));
          float yn = getHeight(uv + vec2(0,-eps / uvScale.x));
          vec3 va = normalize(vec3(scale, 0, xp - xn));
          vec3 vb = normalize(vec3(0, scale, yp - yn));
          vec3 bump = vec3(cross(vb.xzy, va.xzy));
          return normalize(bump);
        }

        void main () {
          b = barycentric;
          vuv = uv;

          if (mod(instance, 2.) == 0.) {
            // vuv.xy = vuv.yx;
          }

          height = getHeight(vuv);
          vec3 normalMap = getNormalMap(vuv);

          vec3 pos = position;

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

          vec4 pos4 = vec4(pos, 1);
          pos4 = iModel * pos4;
          pos = normalize(pos4.xyz);
          // pos = pos4.xyz;

          vnormal = normalize(iModelNormal * normalMap);
          
          pos *= height;
          pos4 = vec4(pos, 1);

          gl_Position = proj * view * model * pos4;
        }`,
      attributes: {
        iA: {
          buffer: this.iA,
          divisor: 1
        },
        iB: {
          buffer: this.iB,
          divisor: 1
        },
        iC: {
          buffer: this.iC,
          divisor: 1
        },
      },
      uniforms: {
        heightMap: function(context, props) {
          return props.pollenet.height;
        },
        uvScale: scale
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
