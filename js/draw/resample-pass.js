const glslify = require('glslify');
const glm = require('gl-matrix');


const identity = glm.mat3.create();

const resamplePass = regl({
  frag: glslify(`
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform mat3 transform;

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      uv = (transform * vec3(uv, 1)).xy;
      if (uv.x > 1. || uv.y > 1. || uv.x < 0. || uv.y < 0.) {
        discard;
      }
      gl_FragColor = texture2D(source, uv);
    }`),
  uniforms: {
    direction: regl.prop('direction'),
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    },
    transform: function(context, props) {
      return props.hasOwnProperty('transform') ? props.transform : identity;
    }
  },
  framebuffer: regl.prop('destination')
});

module.exports = resamplePass;
