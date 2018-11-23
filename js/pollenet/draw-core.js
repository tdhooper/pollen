const mat4 = require('gl-matrix').mat4;
const mat3 = require('gl-matrix').mat3;
const vec3 = require('gl-matrix').vec3;
const glslify = require('glslify');
const wythoffModels = require('../geometry/wythoff-models');


class DrawCore {

  constructor(poly, abc) {

    var wythoff = wythoffModels(poly, abc);

    var special = wythoff.aligned.matrix;

    var models = wythoff.models;

    // models = models.slice(7, 8);
    // models = models.slice(0, 1);
    // models = [wythoff.aligned];


    this.wythoff = wythoff.models;
    this.special = special;

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

    this.draw = regl({
      cull: {
        enable: true,
        face: 'back'
      },
      // primitive: 'lines',
      frag: glslify`
        #extension GL_OES_standard_derivatives : enable

        precision mediump float;
        #pragma glslify: grid = require(glsl-solid-wireframe/barycentric/scaled)
        varying vec2 b;
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
            float l = dot(lPos, normal) * .5 + .75;
            gl_FragColor = vec4(tex * l, 1);
            // gl_FragColor = vec4(tex, 1);
            gl_FragColor = vec4(normal * .5 + .5, 1);
            // gl_FragColor = vec4(vec3(l), 1);
            // gl_FragColor = vec4(0, vuv, 1);
            // gl_FragColor = vec4(0, mod(vuv, .5) / .5, 1);
            gl_FragColor = vec4(vec3(grid(b, .1)) * (normal * .5 + .5), 1);
            // gl_FragColor = vec4(vec3(grid(b, .1)) * vec3(1, mod(vuv, .05) / .05), 1);
            // gl_FragColor = vec4(vec3(grid(b, .1)) * vec3(1, vuv), 1);
            // gl_FragColor = vec4(vec3(grid(b, .1)) * vec3(1, sign(flipNormal)), 1);
        }`,
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
        },
        iModelViewNormal: function(context, props) {
          var view = props.camera.view();
          var model = props.pollenet.model;
          var modelView = mat4.multiply([], view, model);
          return models.map(w => {
            var iModel = w.matrix;
            var iModelView = mat4.multiply([], model, iModel);
            var normal = mat3.fromMat4([], iModelView);
            mat3.invert(normal, normal);
            mat3.transpose(normal, normal);
            return normal;
          });
        },
        mesh: (context, props) => {
          var LODs = props.pollenet.source.wireframeLODs;

          var model = props.pollenet.model;
          var view = props.camera.view();

          var camPos = mat4.getTranslation([], mat4.invert([], view));
          var modelPos = mat4.getTranslation([], model);
          var dist = vec3.dist(camPos, modelPos);

          var vFOV = Math.PI / 10;
          var vHeight = 2 * Math.tan( vFOV / 2 ) * dist;
          var aspect = context.viewportWidth / context.viewportHeight;

          var scale = mat4.getScaling([], model)[0] * 2;
          var fraction = scale / vHeight;

          fraction = Math.pow(fraction, .5);

          var lod = Math.round(fraction * (LODs.length - 1));
          lod = Math.min(lod, LODs.length - 1);

          return LODs[lod];
        }
      },
      attributes: {
        position: regl.context('mesh.positions'),
        uv: regl.context('mesh.uvs'),
        barycentric: regl.context('mesh.barycentric'),
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
          buffer: function(context) {
            return context.iModelViewNormal.map(m => {
              return m.slice(0, 3);
            });
          },
          divisor: 1
        },
        iModelNormalRow1: {
          buffer: function(context) {
            return context.iModelViewNormal.map(m => {
              return m.slice(3, 6);
            });
          },
          divisor: 1
        },
        iModelNormalRow2: {
          buffer: function(context) {
            return context.iModelViewNormal.map(m => {
              return m.slice(6, 9);
            });
          },
          divisor: 1
        }
      },
      elements: regl.context('mesh.cells'),
      instances: N,
      uniforms: {
        model: regl.context('model'),
        view: regl.context('view'),
        proj: regl.context('proj'),
        image: function(context, props) {
          return props.pollenet.image;
        },
        normalMap: function(context, props) {
          return props.pollenet.normal;
        }
      },
      framebuffer: regl.prop('destination')
    });
  }
}


module.exports = DrawCore;
