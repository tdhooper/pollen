
const heightMapPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D difference;
    uniform sampler2D source;
    uniform vec2 resolution;

    void main () {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      vec3 tex = texture2D(source, uv).rgb;
      vec3 a = texture2D(difference, vec2(0, 0)).rgb;
      vec3 b = texture2D(difference, vec2(1, 0)).rgb;
      float aDist = distance(tex, a);
      float bDist = distance(tex, b);
      float height = aDist / (aDist + bDist);
      height = pow(height, 2.);
      gl_FragColor = vec4(vec3(height), 1);
      // gl_FragColor = vec4(tex, 1);
      // gl_FragColor = vec4(b, 1);
    }`,
  uniforms: {
    difference: regl.prop('difference'),
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});

module.exports = heightMapPass;
