const glslify = require('glslify');


const drawVideo = regl({
  frag: glslify(`
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform mat3 transform;
    uniform vec2 aUv;
    uniform vec2 bUv;
    uniform vec2 cUv;

    const float PI = 3.141592653589793;

    float smin(float a, float b, float r) {
      vec2 u = max(vec2(r - a,r - b), vec2(0));
      return max(r, min (a, b)) - length(u);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - resolution.xy / 2.) / min(resolution.x * (.5 + .5 * .666), resolution.y);

      uv.x += .5;
      uv *= .7;

      float mask = ceil(.2 - length(uv));

      float r = PI * -1./6.;
      uv *= mat2(cos(r), sin(r), -sin(r), cos(r));
      
      // conversion to hexagonal coordinates
      uv *= mat2(
        1, -1. / 1.73,
        0, 2. / 1.73
      ) * 5.;

      uv += vec2(1./3.);

      vec3 g = vec3(uv, 1. - uv.x - uv.y);

      // cell id
      vec3 id = smoothstep(1., 1.01, g + 1.);
      id = floor(g + 1.);

      g = fract(g); // diamond coords
      if (length(g) > 1.) g = 1. - g; // barycentric coords

      vec3 border = 1. - abs(2. * fract(g) - 1.); // distance to border

      uv = g.r * aUv + g.r * bUv + g.b * cUv;
      vec3 color = texture2D(source, uv).rgb;

      float roundBorder = smin(border.r, smin(border.g, border.b, .15), .15);
      color *= vec3(smoothstep(0., .02, roundBorder));
      color *= id.r * id.g * id.b;
      color *= mask;

      gl_FragColor = vec4(color, 1.);
    }`),
  uniforms: {
    source: regl.prop('source'),
    transform: regl.prop('transform'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    },
    aUv: function(context, props) {
      return props.abcUv[0];
    },
    bUv: function(context, props) {
      return props.abcUv[1];
    },
    cUv: function(context, props) {
      return props.abcUv[2];
    }
  },
  depth: {
    enable: false
  }
});

module.exports = drawVideo;
