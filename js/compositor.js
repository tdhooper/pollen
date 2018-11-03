const setupPass = require('./draw/setup-pass');


class Compositor {

  constructor() {
    this.postEffects = [];
    this.buffer = regl.framebuffer({
      color: regl.texture({
        width: 1024,
        height: 1024
      }),
      depthTexture: true,
    });
  }

  addPost(effect) {
    this.postEffects.push(effect);
  }

  clear(context) {
    regl.clear({
      color: [.9, .9, .9, 1],
      depth: 1,
      framebuffer: this.buffer
    });
    regl.clear({
      color: [.9, .9, .9, 1],
      depth: 1,
    });
  }

  resize(context) {
    var size = [context.drawingBufferWidth, context.drawingBufferHeight];
    if (this.buffer.width !== size[0] || this.buffer.height !== size[1]) {
      this.buffer.resize(size[0], size[1]);
    }
  }

  draw(context) {
    this.resize(context);

    setupPass(() => {
      this.postEffects.forEach(effect => {
        effect.draw({
          source: this.buffer
        });
      });
    });
  }
}

module.exports = Compositor;
