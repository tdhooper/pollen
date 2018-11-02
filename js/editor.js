const mat4 = require('gl-mat4');
const glslify = require('glslify');
const createCamera = require('canvas-orbit-camera');

module.exports = function() {

  require('./setup-regl');

  const glm = require('gl-matrix');
  const DrawPollenet = require('./draw-pollenet');
  const VideoSource = require('./video-source');
  const drawVideo = require('./draw/video');
  const setupPass = require('./draw/setup-pass');
  const resamplePass = require('./draw/resample-pass');
  const dofPass = require('./draw/dof-pass');
  const Compositor = require('./compositor');


  const camera = createCamera(regl._gl.canvas);
  camera.distance = 10;


  var btn = document.createElement('button');
  btn.textContent = 'Save';
  btn.classList.add('save-button');
  document.body.appendChild(btn);
  btn.addEventListener('click', send);
  var channel = new BroadcastChannel('pollen');


  var abcUv = [
    [1, 1],
    [0, 1],
    [1, 0]
  ];

  const drawPollenet = new DrawPollenet(abcUv, 6);
  const videoSource = new VideoSource();
  const compositor = new Compositor();
  compositor.addPost(dofPass);


  var previewMat = glm.mat3.create();
  glm.mat3.scale(previewMat, previewMat, [.2, .2]);
  glm.mat3.translate(previewMat, previewMat, [.1, .1]);
  glm.mat3.invert(previewMat, previewMat);

  var previewMatViewport = glm.mat3.create();

  function send() {
    videoSource.toObj().then(sourceObj => {
      channel.postMessage(sourceObj);
    });
  }

  const setupView = regl({
    uniforms: {
      view: () => {
        return camera.view();
      }
    }
  });

  var model = mat4.identity([]);
  // mat4.scale(model, model, [1,1,100]);

  regl.frame((context) => {
    compositor.clear();

    camera.rotate([.003,0.002],[0,0]);
    camera.tick();

    context.camera = camera;

    context.proj = mat4.perspective([],
      Math.PI / 10,
      context.viewportWidth / context.viewportHeight,
      0.01,
      1000
    );

    videoSource.update();
    setupView(function() {
      drawPollenet.draw(videoSource, model, compositor.buffer);
    });

    compositor.draw(context);

    var ratio = context.drawingBufferWidth / context.drawingBufferHeight;
    glm.mat3.scale(previewMatViewport, previewMat, [ratio, 1]);
    setupPass(function() {
      drawVideo({
        source: videoSource.imageBuffer,
        transform: previewMatViewport,
        abcUv: abcUv
      });
    });
  });

};
