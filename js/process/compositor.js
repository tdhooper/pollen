const setupPass = require('../draw/setup-pass');
const resamplePass = require('../draw/resample-pass');


class Compositor {

  constructor() {
    this.postEffects = [];
    this.preEffects = [];
    this.buffer = regl.framebuffer({
      color: regl.texture({
        width: 1024,
        height: 1024
      }),
      depthTexture: true,
    });
  }

  addPre(effect) {
    this.preEffects.push(effect);
  }

  addPost(effect) {
    this.postEffects.push(effect);
  }

  clear(context) {
    regl.clear({
      // color: [0, 0, 0, 1],
      depth: 1,
      framebuffer: this.buffer
    });
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });
  }

  resize(context) {
    var size = [context.drawingBufferWidth, context.drawingBufferHeight];
    if (this.buffer.width !== size[0] || this.buffer.height !== size[1]) {
      this.buffer.resize(size[0], size[1]);
    }
    this.preEffects.forEach(effect => {
      effect.resize && effect.resize(size[0], size[1]);
    });
    this.postEffects.forEach(effect => {
      effect.resize && effect.resize(size[0], size[1]);
    });
  }

  drawPre(context) {
    this.resize(context);

    setupPass(() => {
      this.preEffects.forEach(effect => {
        effect.draw({
          source: this.buffer
        });
      });
    });
  }

  drawPost(context) {
    this.resize(context);

    setupPass(() => {
      if ( ! this.postEffects.length) {
        resamplePass({
          source: this.buffer
        });
      } else {
        this.postEffects.forEach(effect => {
          effect.draw({
            source: this.buffer
          });
        });
      }
    });
  }
}

module.exports = Compositor;
