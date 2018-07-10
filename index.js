const mat4 = require('gl-mat4');
const icosphere = require('icosphere');
const fit = require('canvas-fit');
const normals = require('angle-normals');

const canvas = document.body.appendChild(document.createElement('canvas'));
const regl = require('regl')(canvas);
const camera = require('canvas-orbit-camera')(canvas);

window.addEventListener('resize', fit(canvas), false);

const mesh = icosphere(2);

const drawSphere = regl({
  frag: `
    precision mediump float;
    varying vec3 vnormal;
    void main () {
      gl_FragColor = vec4(vnormal * .5 + .5, 1.0);
    }`,
  vert: `
    precision mediump float;
    uniform mat4 proj;
    uniform mat4 model;
    uniform mat4 view;
    attribute vec3 position;
    attribute vec3 normal;
    varying vec3 vnormal;
    void main () {
      vnormal = normal;
      gl_Position = proj * view * model * vec4(position, 1.0);
    }`,
  attributes: {
    position: mesh.positions,
    normal: normals(mesh.cells, mesh.positions)
  },
  elements: mesh.cells,
  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
        Math.PI / 2,
        viewportWidth / viewportHeight,
        0.01,
        1000),
    model: mat4.identity([]),
    view: () => camera.view()
  }
})

regl.frame(() => {
  regl.clear({
    color: [0, 0, 0, 1]
  })
  camera.tick()
  drawSphere()
})
