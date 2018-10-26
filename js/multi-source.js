
class MultiSource {

  constructor(count, size) {

    this.heightTexture = regl.texture({
      width: count * size,
      height: size,
      mag: 'linear'
    });

    this.imageTexture = regl.texture({
      width: count * size,
      height: size,
      mag: 'linear',
      min: 'linear'
    });

    this.size = size;
    this.count = count;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.context = this.canvas.getContext('2d');
    this.slot = 0;
  }

  get height() {
    return this.heightTexture;
  }

  get image() {
    return this.imageTexture;
  }

  add(obj) {
    this.context.drawImage(
        obj.height,
        0, 0, obj.height.width, obj.height.height,
        0, 0, this.size, this.size
    );
    this.heightTexture.subimage(this.canvas, this.slot * this.size, 0);

    this.context.drawImage(
        obj.image,
        0, 0, obj.image.width, obj.image.height,
        0, 0, this.size, this.size
    );
    this.imageTexture.subimage(this.canvas, this.slot * this.size, 0);

    this.slot = (this.slot + 1) % this.count;
  }
}

module.exports = MultiSource;
