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

float hash(float p)
{
    vec3 p3  = fract(vec3(p) * HASHSCALE1);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}


// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise(vec3 x) {
    const vec3 step = vec3(110, 241, 171);

    vec3 i = floor(x);
    vec3 f = fract(x);
 
    // For performance, compute the base input to a 1D hash from the integer part of the argument and the 
    // incremental change to the 1D based on the 3D -> 1D wrapping
    float n = dot(i, step);

    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix( hash(n + dot(step, vec3(0, 0, 0))), hash(n + dot(step, vec3(1, 0, 0))), u.x),
                   mix( hash(n + dot(step, vec3(0, 1, 0))), hash(n + dot(step, vec3(1, 1, 0))), u.x), u.y),
               mix(mix( hash(n + dot(step, vec3(0, 0, 1))), hash(n + dot(step, vec3(1, 0, 1))), u.x),
                   mix( hash(n + dot(step, vec3(0, 1, 1))), hash(n + dot(step, vec3(1, 1, 1))), u.x), u.y), u.z);
}

#define NUM_OCTAVES 2

float fbm ( in vec3 _st) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(20.0);
    // Rotate to reduce axial bias
    mat3 rot = mat3(cos(0.5), sin(0.5), 0,
                    -sin(0.5), cos(0.50), 0,
                    0, 0, 1
                );
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.2 + shift;
        a *= 0.5;
    }
    return v;
}

vec2 map(vec3 st) {

    vec2 a, b;
    
    a.x = fbm(st);
    a.y = fbm(st + vec3(1));

    b.x = fbm(st + 4. * vec3(a,0));
    b.y = fbm(st + 2. * vec3(a,0));

    return normalize(b - .4);
}

  uniform float time;

        void main() {
          vec2 xy = gl_FragCoord.xy;
          xy += map(vec3(xy * .2, time * 2.)) * 2.5;
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
