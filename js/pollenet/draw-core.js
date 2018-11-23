const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;
const glslify = require('glslify');
const wythoffModels = require('../geometry/wythoff-models');


class DrawCore {

  constructor(poly, abc) {

    var {models, iA, iB, iC} = wythoffModels(poly, abc);

    // models = models.slice(0, 1);
    // iA = iA.slice(0, 1);
    // iB = iB.slice(0, 1);
    // iC = iC.slice(0, 1);

    this.models = models;
    this.iA = iA;
    this.iB = iB;
    this.iC = iC;

    var iModelRow0 = [];
    var iModelRow1 = [];
    var iModelRow2 = [];
    var iModelRow3 = [];

    models.forEach(model => {
      iModelRow0.push(model.slice(0, 4));
      iModelRow1.push(model.slice(4, 8));
      iModelRow2.push(model.slice(8, 12));
      iModelRow3.push(model.slice(12, 16));
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
        varying vec3 vnormal;
        uniform sampler2D image;
        void main () {
            vec3 tex = texture2D(image, vuv).rgb;
            vec3 lPos = normalize(vec3(2,1,0));
            float l = dot(lPos, vnormal) * .5 + .75;
            // gl_FragColor = vec4(tex * l, 1);
            gl_FragColor = vec4(tex, 1);
            // gl_FragColor = vec4(vnormal * .5 + .5, 1);
            // gl_FragColor = vec4(0, vuv, 1);
            // gl_FragColor = vec4(vec3(grid(b, .1)) * (vnormal * .5 + .5), 1);
            gl_FragColor = vec4(vec3(grid(b, .1)) * vec3(1, vuv), 1);
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
      },
      framebuffer: regl.prop('destination')
    });
  }
}


module.exports = DrawCore;
