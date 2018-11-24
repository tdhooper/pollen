
class Source {

  constructor() {

    this.normalTexture = regl.texture({
      width: 256,
      height: 256,
      mag: 'linear',
      min: 'linear'
    });

    this.imageTexture = regl.texture({
      width: 1024,
      height: 1024,
      mag: 'linear',
      min: 'linear'
    });
  }

  get normal() {
    return this.normalTexture;
  }

  get image() {
    return this.imageTexture;
  }

  fromObj(obj) {
    this.LODs = obj.LODs;

    if (obj.normal.pixels) {
      this.normalTexture.subimage({
        data: obj.normal.pixels
      });
      this.imageTexture.subimage({
        data: obj.image.pixels
      });
    } else {
      this.normalTexture.subimage({
        data: obj.normal
      });
      this.imageTexture.subimage({
        data: obj.image
      });
    }
  }
}

module.exports = Source;
