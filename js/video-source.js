const mat3 = require('gl-matrix').mat3;
const mat4 = require('gl-matrix').mat4;

const WebcamTexture = require('./webcam-texture');
const setupPass = require('./draw/setup-pass');
const resamplePass = require('./draw/resample-pass');
const blurPass = require('./draw/blur-pass');
const normalMapPass = require('./draw/normal-map-pass');
const Source = require('./source');
const bufferToObj = require('./send-buffer').bufferToObj;
const createPatch = require('./geometry/create-patch');
const applyHeightMap = require('./geometry/apply-height-map');
const xz = require('./geometry/xz');


class VideoSource extends Source {

  constructor(wythoff, abc, abcUv) {
    super(wythoff);

    var LODs = createPatch(5, abc, abcUv);

    this.applyHeightMap = applyHeightMap(wythoff, LODs[5]);

    this.LODs = [LODs[5]];

    this.iModel = wythoff.models[0].matrix;
    this.iModelInv = mat4.invert([], this.iModel);

    this.webcam = new WebcamTexture(regl);

    this.heightTexture = regl.texture({
      width: 256,
      height: 256,
      mag: 'linear'
    });

    this.heightBuffer = regl.framebuffer({
      depth: false,
      color: this.heightTexture
    });

    this.normalBuffer = regl.framebuffer({
      depth: false,
      color: this.normalTexture
    });

    this.imageBuffer = regl.framebuffer({
      depth: false,
      color: this.imageTexture
    });

    this.blurBuffers = [0,0].map(_ => regl.framebuffer({
        depth: false,
        color: regl.texture({
          width: this.heightBuffer.width,
          height: this.heightBuffer.height,
          mag: 'linear'
        })
      })
    );

    var videoMat = mat3.create();
    var videoScale = 1;
    var videoTranslate = .5 / videoScale - .5;
    mat3.scale(videoMat, videoMat, [videoScale, videoScale]);
    mat3.translate(videoMat, videoMat, [videoTranslate, videoTranslate]);
    mat3.invert(videoMat, videoMat);

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
      bufferToObj(this.normalBuffer),
      bufferToObj(this.imageBuffer),
    ]).then(result => {
      var height = result[0];
      var normal = result[1];
      var image = result[2];
      return this.applyHeightMap(height).then(LODs => {
        return {
          normal: normal,
          image: image,
          LODs: LODs
        };
      });
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

      resamplePass({
        source: this.blurBuffers[0],
        destination: this.heightBuffer
      });

      // Create the normal map
      normalMapPass({
        source: this.heightBuffer,
        destination: this.normalBuffer,
        iModel: this.iModel,
        iModelInv: this.iModelInv,
      });

    });
  }
}

module.exports = VideoSource;
