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
        attribute vec3 iA;
        attribute vec3 iB;
        attribute vec3 iC;
        varying vec2 vuv;
        varying float height;
        varying vec3 vnormal;
        varying mat3 vTBN;

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
          vec3 bump = vec3(cross(va, vb));
          return normalize(bump);
        }

        void main () {
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

          vec4 pos4 = vec4(pos, 1);
          pos4 = iModel * pos4;
          pos = normalize(pos4.xyz);
          // pos = pos4.xyz;

          vec3 center = normalize(mod(instance, 2.) == 0. ? iC : iB);
          vec3 edge = normalize(mod(instance, 2.) == 0. ? iB : iC);
          vec3 origin = normalize(iA);

          vec3 normal = normalize(pos);
          vec3 tangent = cross(pos, iA);
          vec3 bitangent = cross(normal, tangent);

          vec3 N = normalize(vec3(model * vec4(normal, 0)));
          vec3 T = normalize(vec3(model * vec4(tangent, 0)));
          vec3 B = normalize(vec3(model * vec4(bitangent, 0)));


          T = normalize(cross(pos, cross(origin, edge)));
          B = normalize(cross(pos, cross(origin, center)));

          T = normalize(vec3(model * vec4(T, 0)));
          B = normalize(vec3(model * vec4(B, 0)));

          // T = normalize(cross(normal, cross(T, normal)));
          // B = normalize(cross(normal, cross(B, normal)));

          // tangent should be pos -> center

          vTBN = mat3(T, B, N);

          vnormal = vTBN * normalMap;
          // vnormal = normalMap;

          vec3 nm = normalize(vec3(0,0,1));
          if (mod(instance, 2.) == 0.) {
            // nm.x *= -1.;
          }
          // vnormal = nm;
          // vnormal = vTBN * nm;

          // vnormal = N;
          
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
