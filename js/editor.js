const mat4 = require('gl-mat4');
const glslify = require('glslify');
const createRegl = require('regl');
const createCamera = require('canvas-orbit-camera');

module.exports = function() {

  const canvas = document.body.appendChild(document.createElement('canvas'));
  global.regl = createRegl({
    canvas: canvas,
    attributes: {
      preserveDrawingBuffer: true
    }
  });

  const glm = require('gl-matrix');
  const Pollenet = require('./pollenet');
  const VideoSource = require('./video-source');
  const drawVideo = require('./draw/video');
  const setupPass = require('./draw/setup-pass');


  const camera = createCamera(canvas);
  camera.distance = 10;


  var btn = document.createElement('button');
  btn.textContent = 'Save';
  btn.classList.add('save-button');
  document.body.appendChild(btn);
  btn.addEventListener('click', send);
  var channel = new BroadcastChannel('pollen');

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

  const pollenet = new Pollenet(abcUv);
  const videoSource = new VideoSource();

  var previewMat = glm.mat3.create();
  glm.mat3.scale(previewMat, previewMat, [.2, .2]);
  glm.mat3.translate(previewMat, previewMat, [.1, .1]);
  glm.mat3.invert(previewMat, previewMat);

  var previewMatViewport = glm.mat3.create();

  function send() {
    canvas.toBlob(blob => {
      // console.log(blob)
      channel.postMessage(blob);
    });

    // videoSource.asMessage().then(message => {
    //   channel.postMessage(message);
    // });
  }

  const setupView = regl({
    uniforms: {
      view: () => {
        return camera.view();
      }
    }
  });

  regl.frame((context) => {
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
      stencil: 0
    });
    camera.rotate([.003,0.002],[0,0]);
    camera.tick();

    videoSource.update();
    setupView(function() {
      pollenet.draw(videoSource.spec);
    });

    var ratio = context.drawingBufferWidth / context.drawingBufferHeight;
    glm.mat3.scale(previewMatViewport, previewMat, [ratio, 1]);
    setupPass(function() {
      drawVideo({
        source: videoSource.croppedVideo,
        transform: previewMatViewport,
        abcUv: abcUv
      });
    });
  });

};
