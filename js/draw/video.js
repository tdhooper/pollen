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

    #pragma glslify: range = require('glsl-range')

    float side(vec2 p, vec2 a, vec2 b) {
      vec2 ab = a - b;
      vec2 pb = p - b;
      return pb.x * ab.y - pb.y * ab.x;
    }

    bool inTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
      bool b1 = side(p, a, b) < 0.;
      bool b2 = side(p, b, c) < 0.;
      bool b3 = side(p, c, a) < 0.;
      return ! ((b1 == b2) && (b2 == b3));
    }

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      uv = (transform * vec3(uv, 1)).xy;
      if (uv.x > 1. || uv.y > 1. || uv.x < 0. || uv.y < 0.) {
        discard;
      }
      if ( ! inTriangle(uv, aUv, bUv, cUv)) {
        discard;
      }
      //vec2 areaUv = range(area.xy, area.zw, uv);
      gl_FragColor = texture2D(source, uv);
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
