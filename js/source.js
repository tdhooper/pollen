const bufferToObj = require('./send-buffer').bufferToObj;


class Source {

  constructor(heightBuffer, imageBuffer) {

    this.heightTexture = regl.texture({
      width: 256,
      height: 256,
      mag: 'linear'
    });

    this.heightBuffer = regl.framebuffer({
      depth: false,
      color: this.heightTexture
    });

    this.imageTexture = regl.texture({
      width: 1024,
      height: 1024,
      mag: 'linear',
      min: 'linear'
    });

    this.imageBuffer = regl.framebuffer({
      depth: false,
      color: this.imageTexture
    });
  }

  toObj() {
    return Promise.all([
      bufferToObj(this.heightBuffer),
      bufferToObj(this.imageBuffer)
    ]).then(result => {
      return {
        height: result[0],
        image: result[1]
      };
    });
  }

  fromObj(obj) {
    if (obj.height.pixels) {
      this.heightTexture.subimage({
        data: obj.height.pixels
      });
      this.imageTexture.subimage({
        data: obj.image.pixels
      });
    } else {
      this.heightTexture.subimage({
        data: obj.height
      });
      this.imageTexture.subimage({
        data: obj.image
      });
    }
  }
}

module.exports = Source;
