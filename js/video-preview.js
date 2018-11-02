const glm = require('gl-matrix');
const setupPass = require('./draw/setup-pass');
const drawVideo = require('./draw/video');


class VideoPreview {

  constructor(abcUv) {
    this.abcUv = abcUv;
    var previewMat = glm.mat3.create();
    glm.mat3.scale(previewMat, previewMat, [.2, .2]);
    glm.mat3.translate(previewMat, previewMat, [.1, .1]);
    glm.mat3.invert(previewMat, previewMat);
    this.previewMat = previewMat;
    this.previewMatViewport = glm.mat3.create();
  }

  draw(obj) {
    setupPass(context => {

      var ratio = context.drawingBufferWidth / context.drawingBufferHeight;
      glm.mat3.scale(this.previewMatViewport, this.previewMat, [ratio, 1]);

      drawVideo({
        source: obj.source.imageBuffer,
        transform: this.previewMatViewport,
        abcUv: this.abcUv
      });
    });
  }
}

module.exports = VideoPreview;
