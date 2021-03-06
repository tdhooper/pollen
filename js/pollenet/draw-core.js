const mat4 = require('gl-matrix').mat4;
const mat3 = require('gl-matrix').mat3;
const vec3 = require('gl-matrix').vec3;
const glslify = require('glslify');
const wythoffModels = require('../geometry/wythoff-models');


class DrawCore {

  constructor(wythoff) {

    var models = wythoff.models;

    // models = models.slice(7, 8);
    // models = models.slice(0, 1);
    // models = [wythoff.aligned];

    this.models = models;

    var iModelRow0 = [];
    var iModelRow1 = [];
    var iModelRow2 = [];
    var iModelRow3 = [];

    models.forEach(w => {
      iModelRow0.push(w.matrix.slice(0, 4));
      iModelRow1.push(w.matrix.slice(4, 8));
      iModelRow2.push(w.matrix.slice(8, 12));
      iModelRow3.push(w.matrix.slice(12, 16));
    });

    var N = models.length;
    var instances = Array(N).fill().map((_, i) => {
      return i;
    });

    var normals = this.calcModelViewNormals(models);
    var iNormalRows = this.extractModelViewNormalRows(normals);

    var normalMatrix = mat3.create();

    this.setup = regl({
      cull: {
        enable: true,
        face: 'back'
      },
      viewport: {
        x: regl.prop('viewport.x'),
        y: regl.prop('viewport.y'),
        width: regl.prop('viewport.width'),
        height: regl.prop('viewport.height'),
      },
      frag: glslify`
        #extension GL_OES_standard_derivatives : enable

        precision mediump float;
        varying vec2 vuv;
        varying mat3 iModelNormal;
        varying vec2 flipNormal;
        uniform sampler2D image;
        uniform sampler2D normalMap;
        uniform float lodLevel;

        vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
            return a + b*cos( 6.28318*(c*t+d) );
        }

        vec3 spectrum(float n) {
            return pal( n, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67) );
        }

        vec3 reflectN(vec3 vin, vec3 planeNormal) {
          float s = 2. * dot(planeNormal, vin);
          vec3 vv = planeNormal * s;
          return vin - vv;
        }

        void main () {
            vec3 tex = texture2D(image, vuv).rgb;
            vec3 normal = texture2D(normalMap, vuv).rgb * 2. - 1.;

            if (sign(flipNormal.x) < 0.) {
              normal = reflectN(normal, vec3(1,0,0));
            }
            normal = normalize(iModelNormal * normal);

            // vec3 lodColor = spectrum(lodLevel / 5.);

            vec3 lPos = normalize(vec3(-1,1,5));
            float l = dot(lPos, normal) * .5 + .75;
            gl_FragColor = vec4(tex * l, 1);
            // gl_FragColor = vec4(mix(tex * l, lodColor, .2), 1);
            // gl_FragColor = vec4(vec3(l), 1);
            // gl_FragColor = vec4(tex, 1);
            // gl_FragColor = vec4(normal * .5 + .5, 1);
            // gl_FragColor = vec4(vec3(l), 1);
            // gl_FragColor = vec4(0, vuv, 1);
            // gl_FragColor = vec4(0, mod(vuv, .5) / .5, 1);
            // gl_FragColor = vec4(lodColor, 1);
        }`,
      context: {
        view: regl.prop('camera._view'),
        proj: function(context, props) {
          return props.camera.projection(
            props.camera._projection,
            props.viewport.width,
            props.viewport.height
          );
        }
      },
      attributes: {
        instance: {
          buffer: instances,
          divisor: 1
        },
        iModelRow0: {
          buffer: iModelRow0,
          divisor: 1
        },
        iModelRow1: {
          buffer: iModelRow1,
          divisor: 1
        },
        iModelRow2: {
          buffer: iModelRow2,
          divisor: 1
        },
        iModelRow3: {
          buffer: iModelRow3,
          divisor: 1
        },
        iModelNormalRow0: {
          buffer: iNormalRows.row0,
          divisor: 1
        },
        iModelNormalRow1: {
          buffer: iNormalRows.row1,
          divisor: 1
        },
        iModelNormalRow2: {
          buffer: iNormalRows.row2,
          divisor: 1
        }
      },
      instances: N,
      uniforms: {
        view: regl.context('view'),
        proj: regl.context('proj'),
      }
    });

    this.draw = regl({
      attributes: {
        position: regl.prop('positions'),
        uv: regl.prop('uvs'),
      },
      elements: regl.prop('cells'),
      uniforms: {
        model: regl.prop('model'),
        normalMatrix: function(context, props) {
          mat3.fromMat4(normalMatrix, props.model);
          mat3.invert(normalMatrix, normalMatrix);
          mat3.transpose(normalMatrix, normalMatrix);
          return normalMatrix;
        },
        image: regl.prop('image'),
        normalMap: regl.prop('normal'),
        lodLevel: regl.prop('lodLevel')
      }
    });
  }

  calcModelViewNormals(models) {

    var modelView = mat4.create();
    var iModelView = mat4.create();
    var normals = models.map(_ => {
      return mat3.create();
    });

    return models.map((w, i) => {
      var model = w.matrix;
      var normal = normals[i];
      mat3.fromMat4(normal, model);
      mat3.invert(normal, normal);
      mat3.transpose(normal, normal);
      return normal;
    });
  }

  extractModelViewNormalRows(normals) {

    var len = this.models.length * 3;
    var row0 = new Float32Array(len);
    var row1 = new Float32Array(len);
    var row2 = new Float32Array(len);
    var rows = {
      row0: row0,
      row1: row1,
      row2: row2
    };

    normals.forEach((m, i) => {
      row0[i * 3 + 0] = m[0];
      row0[i * 3 + 1] = m[1];
      row0[i * 3 + 2] = m[2];

      row1[i * 3 + 0] = m[3];
      row1[i * 3 + 1] = m[4];
      row1[i * 3 + 2] = m[5];

      row2[i * 3 + 0] = m[6];
      row2[i * 3 + 1] = m[7];
      row2[i * 3 + 2] = m[8];
    });

    return rows;
  }
}


module.exports = DrawCore;
