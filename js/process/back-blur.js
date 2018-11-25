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
      frag: `
        precision mediump float;
        uniform sampler2D source;
        uniform vec2 resolution;


// https://www.shadertoy.com/view/4djSRW

#define HASHSCALE1 .1031

//----------------------------------------------------------------------------------------
//  1 out, 1 in...

float hash(float n) { return fract(sin(n) * 1e4); }
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }


// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}


#define NUM_OCTAVES 2

float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(20);
    // Rotate to reduce axial bias
    mat2 rot = mat2(
      cos(.5), sin(.5),
      -sin(.5), cos(.5)
    );
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.2 + shift;
        a *= 0.5;
    }
    return v;
}

vec2 map(float time, vec2 st) {

    vec2 a, b;
    
    a.x = fbm(st);
    a.y = fbm(st + vec2(1));

    b.x = fbm(st + 4. * a + time * .05);
    b.y = fbm(st + time * .2);

    return normalize(b - .4);
}

  uniform float time;

        void main() {
          vec2 xy = gl_FragCoord.xy;
          xy += map(time * 10., xy * .2) * 2.5;
          vec2 uv = vec2(xy / resolution.xy);
          gl_FragColor = texture2D(source, uv) * vec4(vec3(1.01), 1);
        }`,
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
