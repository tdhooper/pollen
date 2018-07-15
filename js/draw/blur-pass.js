const glslify = require('glslify');


const blurPass = regl({
  frag: glslify(`
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 direction;
    uniform vec2 resolution;

    #pragma glslify: blur = require('glsl-fast-gaussian-blur/13')

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      gl_FragColor = blur(source, uv, resolution.xy, direction);
    }`),
  uniforms: {
    direction: regl.prop('direction'),
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});

module.exports = blurPass;
