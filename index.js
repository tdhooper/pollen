const mat4 = require('gl-mat4');
const fit = require('canvas-fit');
const normals = require('angle-normals');
const geometry = require('./geometry/polyhedra');

const canvas = document.body.appendChild(document.createElement('canvas'));
const regl = require('regl')(canvas);
const camera = require('canvas-orbit-camera')(canvas);
camera.distance = 10;

window.addEventListener('resize', fit(canvas), false);

var mesh;
mesh = geometry.icosahedron(2);
// mesh = geometry.tetrahedron(3);

var videoReady = false;
var video = document.createElement('video');
video.width = 200;
video.autoplay = true;
video.controls = true;
video.setAttribute('playsinline', 'playsinline');
document.body.appendChild(video);
var videoTexture = regl.texture();

var constraints = {
    video: true
};
navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
        video.srcObject = mediaStream;
        video.onloadedmetadata = function(e) {
            video.play();
            videoTexture(video);
            videoReady = true;
        };
    })
    .catch(function(err) {
        console.log(err.name + ": " + err.message);
    });


const drawSphere = regl({
  frag: `
    precision mediump float;
    varying vec3 vnormal;
    varying vec2 vuv;
    uniform sampler2D video;
    void main () {
        vec3 tex = texture2D(video, vec2(1) - vuv).rgb;
        gl_FragColor = vec4(tex, 1);
        // gl_FragColor = vec4(vnormal * .5 + .5, 1.0);
    }`,
  vert: `
    precision mediump float;
    uniform mat4 proj;
    uniform mat4 model;
    uniform mat4 view;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    varying vec3 vnormal;
    varying vec2 vuv;
    void main () {
      vnormal = normal;
      vuv = uv;
      gl_Position = proj * view * model * vec4(position, 1.0);
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
    video: videoTexture
  }
})

regl.frame(() => {
  regl.clear({
    color: [.8, .82, .85, 1]
  })
  camera.rotate([.003,0.002],[0,0]);
  camera.tick()
  if (videoReady) {
    videoTexture.subimage(video);
  }
  drawSphere()
})
