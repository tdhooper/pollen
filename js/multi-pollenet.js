const geometry = require('./geometry/polyhedra');
const mat4 = require('gl-matrix').mat4;


var MultiPollenet = function(abcUv, limit) {

  var mesh = geometry.tetrahedron(6, abcUv);
  var instances = Array(limit).fill().map((_, i) => {
    return i;
  });

  this.drawSphere = regl({
    frag: `
      precision mediump float;

      varying vec3 vnormal;
      varying vec2 vuv;

      uniform sampler2D images;

      void main () {
          vec3 image = texture2D(images, vuv).rgb;
          gl_FragColor = vec4(image, 1);
          // gl_FragColor = vec4(1);
      }`,
    vert: `
      precision mediump float;

      uniform mat4 proj;
      uniform mat4 view;
      uniform sampler2D heights;
      uniform float instances;

      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      attribute float instance;

      varying vec2 vuv;

      void main () {
        vuv = vec2(1) - uv;
        vuv.x += instance;
        vuv.x /= instances;
        float height = texture2D(heights, vuv).r;

        vec3 pos = position;
        pos *= mix(.5, 1., height);

        float radius = instance / instances * 1.5;
        float angle = instance * 3.142 * (3. - sqrt(5.));
        vec3 p = vec3(sin(angle) * radius, cos(angle) * radius, 0);

        mat4 model = mat4(
          .1, 0, 0, 0,
          0, .1, 0, 0,
          0, 0, .1, 0,
          p.x, p.y, p.z, 1
        );

        gl_Position = proj * view * model * vec4(pos, 1);
      }`,
    attributes: {
      position: mesh.positions,
      normal: mesh.normals,
      uv: mesh.uvs,
      instance: {
        buffer: instances,
        divisor: 1
      }
    },
    elements: mesh.cells,
    instances: limit,
    uniforms: {
      proj: ({viewportWidth, viewportHeight}) =>
        mat4.perspective([],
          Math.PI / 10,
          viewportWidth / viewportHeight,
          0.01,
          1000
        ),
      images: regl.prop('images'),
      heights: regl.prop('heights'),
      instances: limit
    }
  });
};

MultiPollenet.prototype.draw = function(source) {
  this.drawSphere({
    heights: source.height,
    images: source.image
  });
};

module.exports = MultiPollenet;
