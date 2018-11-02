const geometry = require('./geometry/polyhedra');
const mat4 = require('gl-matrix').mat4;


var Pollenet = function(abcUv, detail) {

  var mesh = geometry.tetrahedron(detail, abcUv);

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
        pos *= mix(.2, 1.5, height);
        gl_Position = proj * view * model * vec4(pos, 1.0);
      }`,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
      uv: mesh.uvs
    },
    elements: mesh.cells,
    uniforms: {
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
