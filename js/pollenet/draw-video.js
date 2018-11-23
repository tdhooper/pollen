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

        vec3 getNormalMap(vec2 uv, float dir) {
          float scale = .1;
          float eps = .05;
          float xp = getHeight(uv + vec2(eps * uvScale.z,0));
          float xn = getHeight(uv + vec2(-eps * uvScale.z,0));
          float yp = getHeight(uv + vec2(0,eps * uvScale.x));
          float yn = getHeight(uv + vec2(0,-eps * uvScale.x));
          vec3 va = normalize(vec3(scale, xp - xn, 0));
          vec3 vb = normalize(vec3(0, yp - yn, scale));
          vec3 bump = vec3(cross(vb, va));
          bump.x *= dir;
          return normalize(bump);
        }

        void main () {
          b = barycentric;
          vuv = uv;

          if (mod(instance, 2.) == 0.) {
            // vuv.xy = vuv.yx;
          }

          height = getHeight(vuv);

          vec3 normalMap = getNormalMap(vuv, sign(position.x));

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

          vec3 normal = normalize((iModel * pos4).xyz);
          vec3 tangent = normalize((iModel * (pos4 - vec4(0,0,.001,0))).xyz);
          vec3 bitangent = normalize((iModel * (pos4 - vec4(.001,0,0,0))).xyz);

          vec3 N = normalize(vec3(model * vec4(normal, 0)));
          vec3 T = normalize(vec3(model * vec4(tangent, 0)));
          vec3 B = normalize(vec3(model * vec4(bitangent, 0)));

          mat3 TBN = mat3(T, B, N);

          // normalMap = vec3(0,1,0);
          vnormal = normalize(normalMap);

          pos4 = iModel * pos4;
          pos4 = vec4(normalize(pos4.xyz) * height, 1);
          
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
