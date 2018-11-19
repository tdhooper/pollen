const glm = require('gl-matrix');

const WebcamTexture = require('./webcam-texture');
const setupPass = require('./draw/setup-pass');
const resamplePass = require('./draw/resample-pass');
const blurPass = require('./draw/blur-pass');
const heightMapPass = require('./draw/height-map-pass');
const Source = require('./source');
const bufferToObj = require('./send-buffer').bufferToObj;
const createPatch = require('./geometry/create-patch');
const applyHeightMap = require('./geometry/apply-height-map');
const xz = require('./geometry/xz');


class VideoSource extends Source {

  constructor() {
    super();

    var abcUv = [
      [1, 1],
      [0, 1],
      [1, 0]
    ];

    var LODs = createPatch(6, abcUv);
    var abc = LODs[0].positions.map(xz);
    this.applyHeightMap = applyHeightMap.bind(
      this,
      abc,
      abcUv,
      LODs[5]
    );
    this.LODs = LODs.slice(1, 6);

    this.webcam = new WebcamTexture(regl);

    this.heightBuffer = regl.framebuffer({
      depth: false,
      color: this.heightTexture
    });

    this.imageBuffer = regl.framebuffer({
      depth: false,
      color: this.imageTexture
    });

    this.blurBuffers = [

      this.heightBuffer,

      regl.framebuffer({
        depth: false,
        color: regl.texture({
          width: this.heightBuffer.width,
          height: this.heightBuffer.height,
          mag: 'linear'
        })
      })
    ];

    var videoMat = glm.mat3.create();
    var videoScale = 1;
    var videoTranslate = .5 / videoScale - .5;
    glm.mat3.scale(videoMat, videoMat, [videoScale, videoScale]);
    glm.mat3.translate(videoMat, videoMat, [videoTranslate, videoTranslate]);
    glm.mat3.invert(videoMat, videoMat);

    this.videoMat = videoMat;
  }

  get height() {
    return this.heightBuffer;
  }

  get image() {
    return this.imageBuffer;
  }

  toObj() {
    return Promise.all([
      bufferToObj(this.heightBuffer),
      bufferToObj(this.imageBuffer),
      this.applyHeightMap(this.heightBuffer)
    ]).then(result => {
      return {
        height: result[0],
        image: result[1],
        LODs: result[2]
      };
    });
  }

  update() {

    this.webcam.update();

    var blurSteps = 20;

    setupPass(() => {

      // Crop the section of video we want to use
      resamplePass({
        source: this.webcam.texture,
        destination: this.imageBuffer,
        transform: this.videoMat
      });

      // Blur the section
      resamplePass({
        source: this.imageBuffer,
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
  }
}

module.exports = VideoSource;
