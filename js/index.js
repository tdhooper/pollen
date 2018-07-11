const mat4 = require('gl-mat4');
const fit = require('canvas-fit');
const normals = require('angle-normals');
const geometry = require('./geometry/polyhedra');
const WebcamTexture = require('./webcam-texture');

const canvas = document.body.appendChild(document.createElement('canvas'));
const regl = require('regl')(canvas);
const camera = require('canvas-orbit-camera')(canvas);
camera.distance = 10;

window.addEventListener('resize', fit(canvas), false);

var mesh;
mesh = geometry.icosahedron(4);
// mesh = geometry.tetrahedron(5);

var webcam = new WebcamTexture(regl);


var heightMap = regl.framebuffer({
  depth: false,
  width: 1024,
  height: 1024
});

const drawHeightMap = regl({
  frag: `
    precision mediump float;
    uniform sampler2D video;
    varying vec2 vuv;
    void main () {
      vec3 tex = texture2D(video, vuv).rgb;
      float height = length(tex);
      gl_FragColor = vec4(vec3(height), 1);
    }`,
  vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 vuv;
    void main () {
      vuv = position;
      gl_Position = vec4(2. * position - 1., 0, 1);
    }`,
  attributes: {
    position: [
      -2, 0,
      0, -2,
      2, 2
    ],
  },
  count: 3,
  uniforms: {
    video: webcam.texture
  },
  framebuffer: heightMap
});

const drawSphere = regl({
  frag: `
    precision mediump float;
    varying vec3 vnormal;
    varying vec2 vuv;
    varying float height;
    uniform sampler2D video;
    void main () {
        vec3 tex = texture2D(video, vec2(1) - vuv).rgb;
        gl_FragColor = vec4(tex, 1);
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
    normal: normals(mesh.cells, mesh.positions),
    uv: mesh.uvs
  },
  elements: mesh.cells,
  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
        Math.PI / 10,
        viewportWidth / viewportHeight,
        0.01,
        1000),
    model: mat4.identity([]),
    view: () => camera.view(),
    video: webcam.texture,
    heightMap: heightMap
  }
})

regl.frame(() => {
  regl.clear({
    color: [.8, .82, .85, 1]
  })
  camera.rotate([.003,0.002],[0,0]);
  camera.tick()
  webcam.update();
  drawHeightMap();
  drawSphere()
})
