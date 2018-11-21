const wire = require('gl-wireframe');


class Source {

  constructor() {

    this.heightTexture = regl.texture({
      width: 256,
      height: 256,
      mag: 'linear'
    });

    this.imageTexture = regl.texture({
      width: 1024,
      height: 1024,
      mag: 'linear',
      min: 'linear'
    });
  }

  get height() {
    return this.heightTexture;
  }

  get image() {
    return this.imageTexture;
  }

  fromObj(obj) {
    this.LODs = obj.LODs;
    this.wireframeLODs = this.LODs.map(geom => {
      geom = Object.assign({}, geom);
      geom.cells = wire(geom.cells);
      return geom;
    });

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
