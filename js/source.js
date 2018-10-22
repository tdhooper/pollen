const bufferToBlob = require('./send-buffer').bufferToBlob;


class Source {

  constructor(heightBuffer, imageBuffer) {

    this.heightBuffer = regl.framebuffer({
      depth: false,
      color: regl.texture({
        width: 256,
        height: 256,
        mag: 'linear'
      })
    });

    this.imageBuffer = regl.framebuffer({
      depth: false,
      color: regl.texture({
        width: 1024,
        height: 1024,
        mag: 'linear',
        min: 'linear'
      })
    });

    this.spec = {
      height: heightBuffer,
      image: imageBuffer
    };
  }

  toObj() {
    return Promise.all([
      bufferToBlob(this.heightBuffer),
      bufferToBlob(this.imageBuffer)
    ]).then(result => {
      return {
        height: result[0],
        image: result[1]
      };
    });
  }

  fromObj(obj) {
    this.heightBuffer.data(obj.height.pixels);
    this.imageBuffer.data(obj.image.pixels);
  }
}

module.exports = Source;
