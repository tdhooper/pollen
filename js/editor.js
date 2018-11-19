
module.exports = function() {

  require('./setup-regl');

  const createCamera = require('canvas-orbit-camera');
  const mat4 = require('gl-matrix').mat4;
  const quat = require('gl-matrix').quat;
  const Pollenet = require('./pollenet');
  const DrawPollenet = require('./draw-pollenet');
  const VideoSource = require('./video-source');
  const VideoPreview = require('./video-preview');
  const Compositor = require('./compositor');
  const DofPass = require('./draw/dof-pass');
  const polyhedra = require('polyhedra');


  const camera = createCamera(regl._gl.canvas);
  camera.distance = 10;
  quat.rotateX(camera.rotation, camera.rotation, 1);
  quat.rotateY(camera.rotation, camera.rotation, .5);
  camera.projection = (width, height) => {
    return mat4.perspective([],
      Math.PI / 10,
      width / height,
      0.01,
      1000
    );
  };

  var abcUv = [
    [1, 1],
    [0, 1],
    [1, 0]
  ];
  var poly = polyhedra.platonic.Tetrahedron;

  const drawPollenet = new DrawPollenet(abcUv, 6);
  const videoSource = new VideoSource(abcUv, poly);
  const pollenet = new Pollenet(videoSource);
  const videoPreview = new VideoPreview(abcUv);
  const dofPass = new DofPass(camera);
  const compositor = new Compositor();
  compositor.addPost(dofPass);

  var btn = document.createElement('button');
  btn.textContent = 'Save';
  btn.classList.add('save-button');
  document.body.appendChild(btn);
  btn.addEventListener('click', send);
  var channel = new BroadcastChannel('pollen');
  function send() {
    videoSource.toObj().then(sourceObj => {
      console.log(sourceObj);
      channel.postMessage(sourceObj);
    });
  }

  regl.frame((context) => {
    compositor.clear();

    // camera.rotate([.003,0.002],[0,0]);
    camera.tick();

    mat4.rotate(pollenet._model, pollenet._model, .005, [3,0,2]);

    videoSource.update();
    drawPollenet.draw({
      pollenet: pollenet,
      camera: camera,
      destination: compositor.buffer
    });

    compositor.draw(context);
    videoPreview.draw({
      source: videoSource
    });
  });
};
