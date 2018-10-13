const geometry = require('./geometry/polyhedra');
const mat4 = require('gl-matrix').mat4;


var Pollenet = function(abcUv) {

  var mesh = geometry.tetrahedron(6, abcUv);
  var model = mat4.identity([]);

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
        pos *= mix(.5, 1., height);
        gl_Position = proj * view * model * vec4(pos, 1.0);
      }`,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
      uv: mesh.uvs
    },
    elements: mesh.cells,
    uniforms: {
      proj: ({viewportWidth, viewportHeight}) =>
        mat4.perspective([],
          Math.PI / 10,
          viewportWidth / viewportHeight,
          0.01,
          1000
        ),
      model: model,
      video: regl.prop('video'),
      heightMap: regl.prop('heightMap')
    }
  });
};

Pollenet.prototype.draw = function(spec) {
  this.drawSphere(
    Object.assign({
      mesh: this.mesh
    }, spec)
  );
};

module.exports = Pollenet;
