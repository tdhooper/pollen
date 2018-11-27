
module.exports = function() {

  require('./setup-regl');

  const createCamera = require('canvas-orbit-camera');
  const mat4 = require('gl-matrix').mat4;
  const quat = require('gl-matrix').quat;
  const polyhedra = require('polyhedra');
  const Pollenet = require('./pollenet');
  const DrawPollenet = require('./pollenet/draw-video');
  const DrawPollenetSaved = require('./pollenet/draw-saved');
  const VideoSource = require('./video-source');
  const Source = require('./source');
  const VideoPreview = require('./video-preview');
  const Compositor = require('./process/compositor');
  const DofBlur = require('./process/dof-blur');
  const BackBlur = require('./process/back-blur');
  const wythoffModels = require('./geometry/wythoff-models');
  const control = require('./control');

  const camera = createCamera(regl._gl.canvas);
  camera.distance = 6.5;
  quat.rotateX(camera.rotation, camera.rotation, 1);
  quat.rotateY(camera.rotation, camera.rotation, .5);
  camera._projection = mat4.create();
  camera._view = mat4.create();
  camera.projection = (matrix, width, height) => {
    return mat4.perspective(matrix,
      Math.PI / 10,
      width / height,
      0.01,
      1000
    );
  };

  var abcUv = [
    [0, 0],
    [0, 1],
    [1, 0]
  ];
  var abc = [
    [0, 0, 1],
    [1, 0, 0],
    [-1, 0, 0]
  ];
  var poly = polyhedra.platonic.Tetrahedron;
  var wythoff = wythoffModels(poly, abc);

  const drawPollenet = new DrawPollenet(wythoff);
  // const drawSaved = new DrawPollenetSaved(wythoff);
  const videoSource = new VideoSource(wythoff, abc, abcUv);
  // const source = new Source();
  const pollenet = new Pollenet(videoSource, 0);
  // const pollenetSaved = new Pollenet(source, -1);
  const videoPreview = new VideoPreview(abcUv);
  const compositor = new Compositor();
  // const dofBlur = new DofBlur(camera);
  // compositor.addPost(dofBlur);
  const backBlur = new BackBlur({
    zoom: .005,
    fade: 1,
    magnitude: 10
  });
  compositor.addPre(backBlur);

  var btn = document.createElement('button');
  btn.textContent = 'Save';
  btn.classList.add('save-button');
  document.body.appendChild(btn);
  btn.addEventListener('click', send);
  control.on('click', send);
  var channel = new BroadcastChannel('pollen');
  function send() {
    videoSource.toObj().then(sourceObj => {
      // console.log(sourceObj.LODs[0]);
      // source.fromObj(sourceObj);
      channel.postMessage(sourceObj);
    });
  }

  regl.frame((context) => {
    // camera.rotate([.003,0.002],[0,0]);
    camera.tick();
    camera.view(camera._view);

    compositor.drawPre(context);
    compositor.clear(false);

    mat4.rotate(pollenet._model, pollenet._model, .005, [3,0,2]);

    videoSource.update();

    var size = Math.min(
      context.viewportWidth * (.5 + .5 * .666),
      context.viewportHeight
    );
    var offsetX = context.viewportWidth * .5 - size * .4;
    var offsetY = (context.viewportHeight - size) / 2;

    compositor.buffer.use(function() {
      drawPollenet.setup({
        camera: camera,
        viewport: {
          x: offsetX,
          y: offsetY,
          width: size,
          height: size
        }
      }, function(context) {
        var lod = drawPollenet.pickLOD(
          pollenet.source.LODs,
          pollenet.model,
          camera._view,
          context.viewportWidth,
          context.viewportHeight
        );
        drawPollenet.draw({
          positions: lod.mesh.positions,
          uvs: lod.mesh.uvs,
          cells: lod.mesh.cells,
          lodLevel: lod.level,
          model: pollenet.model,
          image: pollenet.image,
          normal: pollenet.normal,
          height: pollenet.height
        });
      });
    });

    // if (source.LODs) {
    //   drawSaved.draw({
    //     pollenet: pollenetSaved,
    //     camera: camera,
    //     // destination: compositor.buffer
    //   });
    // }

    compositor.drawPost(context);

    videoPreview.draw({
      source: videoSource
    });
  });
};
