const mat4 = require('gl-matrix').mat4;
const mat3 = require('gl-matrix').mat3;
const vec3 = require('gl-matrix').vec3;
const glslify = require('glslify');
const wythoffModels = require('../geometry/wythoff-models');


class DrawCore {

  constructor(poly, abc) {

    var wythoff = wythoffModels(poly, abc);
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

    var pickLOD = this.pickLOD();
    var calcModelViewNormals = this.calcModelViewNormals();
    var extractModelViewNormalRows = this.extractModelViewNormalRows();

    var buildContext = regl({
      context: {
        model:function(context, props) {
          return props.pollenet.model;
        },
        view: function(context, props) {
          return props.camera.view();
        },
        proj: function(context, props) {
          return props.camera.projection(
            context.viewportWidth,
            context.viewportHeight
          );
        }
      }
    });

    var draw = regl({
      cull: {
        enable: true,
        face: 'back'
      },
      // primitive: 'lines',
      frag: glslify`
        #extension GL_OES_standard_derivatives : enable

        precision mediump float;
        varying vec2 vuv;
        varying mat3 iModelNormal;
        varying vec2 flipNormal;
        uniform sampler2D image;
        uniform sampler2D normalMap;

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

            vec3 lPos = normalize(vec3(2,1,0));
            float l = dot(lPos, normal) * .5 + .5;
            l = mix(l, 1., .1) * 1.1;
            // gl_FragColor = vec4(tex * l, 1);
            gl_FragColor = vec4(vec3(l), 1);
            // gl_FragColor = vec4(tex, 1);
            // gl_FragColor = vec4(normal * .5 + .5, 1);
            // gl_FragColor = vec4(vec3(l), 1);
            // gl_FragColor = vec4(0, vuv, 1);
            // gl_FragColor = vec4(0, mod(vuv, .5) / .5, 1);
        }`,
      context: {
        modelViewNormalRows: function(context, props) {
          var modelViewNormals = calcModelViewNormals(
            context.model,
            context.view
          );
          return extractModelViewNormalRows(modelViewNormals);
        },
        mesh: (context, props) => {
          var LODs = props.pollenet.source.LODs;
          return pickLOD(
            props.pollenet.source.LODs,
            context.model,
            context.view,
            context.viewportWidth,
            context.viewportHeight
          );
        }
      },
      attributes: {
        position: regl.context('mesh.positions'),
        uv: regl.context('mesh.uvs'),
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
          buffer: regl.context('modelViewNormalRows.row0'),
          divisor: 1
        },
        iModelNormalRow1: {
          buffer: regl.context('modelViewNormalRows.row1'),
          divisor: 1
        },
        iModelNormalRow2: {
          buffer: regl.context('modelViewNormalRows.row2'),
          divisor: 1
        }
      },
      elements: regl.context('mesh.cells'),
      instances: N,
      uniforms: {
        model: regl.context('model'),
        view: regl.context('view'),
        proj: regl.context('proj'),
        image: regl.prop('pollenet.image'),
        normalMap: regl.prop('pollenet.normal')
      },
      framebuffer: regl.prop('destination')
    });

    this.draw = function(props, callback) {
      buildContext(props, function() {
        draw(props, callback);
      });
    };
  }

  pickLOD() {

    var viewInv = mat4.create();
    var camPos = vec3.create();
    var modelPos = vec3.create();
    var modelScale = mat4.create();

    return function(LODs, model, view, viewportWidth, viewportHeight) {

      mat4.invert(viewInv, view);
      mat4.getTranslation(camPos, viewInv);

      mat4.getTranslation(modelPos, model);
      var dist = vec3.dist(camPos, modelPos);

      var vFOV = Math.PI / 10;
      var vHeight = 2 * Math.tan( vFOV / 2 ) * dist;
      var aspect = viewportWidth / viewportHeight;

      mat4.getScaling(modelScale, model);
      var scale = modelScale[0] * 2;
      var fraction = scale / vHeight;

      fraction /= 2;
      fraction = Math.pow(fraction, .5);

      var lod = Math.round(fraction * (LODs.length - 1));
      lod = Math.min(lod, LODs.length - 1);

      return LODs[lod];
    };
  }

  calcModelViewNormals() {

    var modelView = mat4.create();
    var iModelView = mat4.create();
    var normals = this.models.map(_ => {
      return mat3.create();
    });

    return (model, view) => {

      mat4.multiply(modelView, view, model);

      this.models.forEach((w, i) => {

        var iModel = w.matrix;
        mat4.multiply(iModelView, model, iModel);

        var normal = normals[i];
        mat3.fromMat4(normal, iModelView);
        mat3.invert(normal, normal);
        mat3.transpose(normal, normal);
      });

      return normals;
    };
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

    return function(modelViewNormals) {
      modelViewNormals.forEach((m, i) => {
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
    };
  }
}


module.exports = DrawCore;
