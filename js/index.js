const mat4 = require('gl-mat4');
const glslify = require('glslify');
const createRegl = require('regl');
const createCamera = require('canvas-orbit-camera');

const canvas = document.body.appendChild(document.createElement('canvas'));
global.regl = createRegl(canvas);

const geometry = require('./geometry/polyhedra');
const setupPass = require('./draw/setup-pass');
const resamplePass = require('./draw/resample-pass');
const blurPass = require('./draw/blur-pass');
const heightMapPass = require('./draw/height-map-pass');
const drawSphere = require('./draw/sphere');
const drawVideo = require('./draw/video');
const WebcamTexture = require('./webcam-texture');
const glm = require('gl-matrix');


const camera = createCamera(canvas);
camera.distance = 10;

var resize = function() {
  var width = document.body.clientWidth;
  var height = document.body.clientHeight;
  canvas.width = width;
  canvas.height = height;
};

window.addEventListener('resize', resize, false);

resize();

var noop = function(evt) {
  evt.preventDefault();
};

canvas.addEventListener('touchstart', noop, false);
canvas.addEventListener('touchmove', noop, false);
canvas.addEventListener('touchend', noop, false);

var abcUv = [
  [1, 1],
  [0, 1],
  [1, 0]
];

var mesh;
//mesh = geometry.icosahedron(5, abcUv);
mesh = geometry.tetrahedron(6, abcUv);

var webcam = new WebcamTexture(regl);

var croppedVideo = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: 1024,
    height: 1024,
    mag: 'linear',
    min: 'linear'
  })
});

const blurBuffers = [0,0].map(function() {
  return regl.framebuffer({
    depth: false,
    color: regl.texture({
      width: 64,
      height: 64,
      mag: 'linear'
    })
  });
});

var videoMat = glm.mat3.create();
var videoScale = -2;
var videoTranslate = .5 / videoScale - .5;
glm.mat3.scale(videoMat, videoMat, [videoScale, videoScale]);
glm.mat3.translate(videoMat, videoMat, [videoTranslate, videoTranslate]);
glm.mat3.invert(videoMat, videoMat);

var previewMat = glm.mat3.create();
glm.mat3.scale(previewMat, previewMat, [.2, .2]);
glm.mat3.translate(previewMat, previewMat, [.1, .1]);
glm.mat3.invert(previewMat, previewMat);

var previewMatViewport = glm.mat3.create();

regl.frame((context) => {
  regl.clear({
    color: [.8, .82, .85, 1]
  })
  camera.rotate([.003,0.002],[0,0]);
  camera.tick()
  webcam.update();
  setupPass(function() {
    resamplePass({
      source: webcam.texture,
      destination: croppedVideo,
      transform: videoMat
    });
    resamplePass({
      source: croppedVideo,
      destination: blurBuffers[0]
    });
    var i = 0;
    while (i < 3) {
      blurPass({
        source: blurBuffers[0],
        destination: blurBuffers[1],
        direction: [1,0]
      });
      blurPass({
        source: blurBuffers[1],
        destination: blurBuffers[0],
        direction: [0,1]
      });
      i += 1;
    }
    heightMapPass({
      source: blurBuffers[0],
      destination: blurBuffers[1]
    });
  });
  drawSphere({
    heightMap: blurBuffers[1],
    video: croppedVideo,
    view: camera.view(),
    mesh: mesh
  });
  // console.log(context);
  var ratio = context.drawingBufferWidth / context.drawingBufferHeight;
  glm.mat3.scale(previewMatViewport, previewMat, [ratio, 1]);
  setupPass(function() {
    drawVideo({
      source: croppedVideo,
      transform: previewMatViewport,
      abcUv: abcUv
    });
  })
})
