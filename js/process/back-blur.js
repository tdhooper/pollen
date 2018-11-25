const blur5Pass = require('../draw/blur-5-pass');
const resamplePass = require('../draw/resample-pass');


class BackBlur {

  constructor() {
    this.buffers = [0,0].map(_ => regl.framebuffer({
      depth: false,
      color: regl.texture({
        width: 1,
        height: 1,
        mag: 'linear'
      })
    }));
  }

  resize(width, height) {
    var size = [width, height];
    this.buffers.forEach(buffer => {
      if (buffer.width !== size[0] || buffer.height !== size[1]) {
        buffer.resize(size[0], size[1]);
      }
    });
  }

  draw(props) {

    resamplePass({
      source: props.source,
      destination: this.buffers[0]
    });

    var blurSteps = 1;

    for (var i = 0; i < blurSteps; i++) {
      blur5Pass({
        source: this.buffers[0],
        destination: this.buffers[1],
        direction: [1,0]
      });
      blur5Pass({
        source: this.buffers[1],
        destination: this.buffers[0],
        direction: [0,1]
      });
    }

    resamplePass({
      source: this.buffers[0],
      destination: props.source
    });
  }
}

module.exports = BackBlur;
