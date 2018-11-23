const wire = require('glsl-solid-wireframe');


class Source {

  constructor() {

    this.heightTexture = regl.texture({
      width: 256,
      height: 256,
      mag: 'linear',
      min: 'linear'
    });

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

  get height() {
    return this.heightTexture;
  }

  get normal() {
    return this.normalTexture;
  }

  get image() {
    return this.imageTexture;
  }

  fromObj(obj) {
    this.LODs = obj.LODs;
    this.wireframeLODs = this.LODs.map(geom => {
      var geom2 = wire(geom, {
        attributes: {
          uvs: geom.uvs,
          normals: geom.normals
        }
      });
      geom2.uvs = geom2.attributes.uvs;
      geom2.normals = geom2.attributes.normals;
      return geom2;
    });

    if (obj.height.pixels) {
      this.heightTexture.subimage({
        data: obj.height.pixels
      });
      this.normalTexture.subimage({
        data: obj.normal.pixels
      });
      this.imageTexture.subimage({
        data: obj.image.pixels
      });
    } else {
      this.heightTexture.subimage({
        data: obj.height
      });
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
