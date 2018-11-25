const glslify = require('glslify');
const blurPass = require('../draw/blur-pass');
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

    this.darken = regl({
      frag: glslify(`
        precision mediump float;
        uniform sampler2D source;
        uniform vec2 resolution;
        uniform float time;

        #pragma glslify: fbm = require('../draw/fbm.glsl')

        void main() {
          vec2 xy = gl_FragCoord.xy;
          xy += fbm(vec3(xy * .1, time * 2.)) * 2.5;
          vec2 uv = vec2(xy / resolution.xy);
          gl_FragColor = texture2D(source, uv) * vec4(vec3(1.01), 1);
        }`),
      uniforms: {
        source: regl.prop('source'),
        resolution: function(context) {
          return [context.framebufferWidth, context.framebufferHeight];
        },
        time: regl.context('time')
      },
      framebuffer: regl.prop('destination')
    });
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

    var blurSteps = 3;

    for (var i = 0; i < blurSteps; i++) {
      blurPass({
        source: this.buffers[0],
        destination: this.buffers[1],
        direction: [1,0]
      });
      blurPass({
        source: this.buffers[1],
        destination: this.buffers[0],
        direction: [0,1]
      });
    }

    this.darken({
      source: this.buffers[0],
      destination: props.source
    });
  }
}

module.exports = BackBlur;
