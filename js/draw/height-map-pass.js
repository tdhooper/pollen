
const heightMapPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;

    void main () {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      vec3 tex = texture2D(source, uv).rgb;
      float height = length(tex);
      height = pow(height, 2.);
      gl_FragColor = vec4(vec3(height), 1);
      // gl_FragColor = vec4(tex, 1);
    }`,
  uniforms: {
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});

module.exports = heightMapPass;
