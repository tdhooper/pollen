const geometry = require('./geometry/polyhedra');
const mat4 = require('gl-matrix').mat4;
const vec4 = require('gl-matrix').vec4;
const vec3 = require('gl-matrix').vec3;


var Pollenet = function(abcUv, detail) {

  var LODs = [
    geometry.tetrahedron(1, abcUv),
    geometry.tetrahedron(2, abcUv),
    geometry.tetrahedron(3, abcUv),
    geometry.tetrahedron(4, abcUv),
    geometry.tetrahedron(5, abcUv),
    geometry.tetrahedron(6, abcUv)
  ];

  this.drawSphere = regl({
    frag: `
      precision mediump float;
      varying vec3 vnormal;
      varying vec2 vuv;
      //varying float height;
      uniform sampler2D video;
      uniform sampler2D heightMap;
      void main () {
          vec3 tex = texture2D(video, vec2(1) - vuv).rgb;
          gl_FragColor = vec4(tex, 1);
          // vec3 height = texture2D(heightMap, vec2(1) - vuv).rgb;
          // gl_FragColor = vec4(vec3(height), 1);
          // gl_FragColor = vec4(vnormal * .5 + .5, 1.0);
      }`,
    vert: `
      precision mediump float;
      uniform mat4 proj;
      uniform mat4 model;
      uniform mat4 view;
      uniform sampler2D heightMap;
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      varying vec3 vnormal;
      varying vec2 vuv;
      varying float height;
      void main () {
        vnormal = normal;
        vuv = uv;
        height = texture2D(heightMap, vec2(1) - vuv).r;
        vec3 pos = position;
        // pos *= .8;
        pos *= mix(.5, 1., height);
        gl_Position = proj * view * model * vec4(pos, 1.0);
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
        var model = props.pollenet.model;
        var view = props.camera.view();

        var camPos = mat4.getTranslation([], mat4.invert([], view));
        var modelPos = mat4.getTranslation([], model);
        var dist = vec3.dist(camPos, modelPos);

        var vFOV = Math.PI / 10;
        var vHeight = 2 * Math.tan( vFOV / 2 ) * dist;
        var aspect = context.viewportWidth / context.viewportHeight;

        var fraction = 2 / vHeight;

        var lod = Math.round(fraction * (LODs.length - 1));
        lod = Math.min(lod, LODs.length - 1);

        return LODs[lod];
      }
    },
    attributes: {
      position: regl.context('mesh.positions'),
      normal: regl.context('mesh.normals'),
      uv: regl.context('mesh.uvs')
    },
    elements: regl.context('mesh.cells'),
    uniforms: {
      model: regl.context('model'),
      view: regl.context('view'),
      proj: regl.context('proj'),
      video: function(context, props) {
        return props.pollenet.image;
      },
      heightMap: function(context, props) {
        return props.pollenet.height;
      }
    },
    framebuffer: regl.prop('destination')
  });
};

Pollenet.prototype.draw = function(conf) {
  this.drawSphere(conf);
};

module.exports = Pollenet;
