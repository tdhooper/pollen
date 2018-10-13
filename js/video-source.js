const glm = require('gl-matrix');

const WebcamTexture = require('./webcam-texture');
const setupPass = require('./draw/setup-pass');
const resamplePass = require('./draw/resample-pass');
const blurPass = require('./draw/blur-pass');
const heightMapPass = require('./draw/height-map-pass');


var videoSource = function() {
  this.webcam = new WebcamTexture(regl);

  this.croppedVideo = regl.framebuffer({
    depth: false,
    color: regl.texture({
      width: 1024,
      height: 1024,
      mag: 'linear',
      min: 'linear'
    })
  });

  this.blurBuffers = [0,0].map(function() {
    return regl.framebuffer({
      depth: false,
      color: regl.texture({
        width: 256,
        height: 256,
        mag: 'linear'
      })
    });
  });

  var videoMat = glm.mat3.create();
  var videoScale = -1.5;
  var videoTranslate = .5 / videoScale - .5;
  glm.mat3.scale(videoMat, videoMat, [videoScale, videoScale]);
  glm.mat3.translate(videoMat, videoMat, [videoTranslate, videoTranslate]);
  glm.mat3.invert(videoMat, videoMat);

  this.videoMat = videoMat;

  this.spec = {
    heightMap: this.blurBuffers[1],
    video: this.croppedVideo,
  };
};

videoSource.prototype.update = function() {

  this.webcam.update();

  var blurSteps = 20;

  setupPass(() => {

    // Crop the section of video we want to use
    resamplePass({
      source: this.webcam.texture,
      destination: this.croppedVideo,
      transform: this.videoMat
    });

    // Blur the section
    resamplePass({
      source: this.croppedVideo,
      destination: this.blurBuffers[0]
    });
    for (var i = 0; i < blurSteps; i++) {
      blurPass({
        source: this.blurBuffers[0],
        destination: this.blurBuffers[1],
        direction: [1,0]
      });
      blurPass({
        source: this.blurBuffers[1],
        destination: this.blurBuffers[0],
        direction: [0,1]
      });
    }

    // Create a monochrome height map
    heightMapPass({
      source: this.blurBuffers[0],
      destination: this.blurBuffers[1]
    });
  });
};

module.exports = videoSource;
