const glslify = require('glslify');


class DofBlur {

  constructor(camera) {

    this.draw = regl({
      frag: glslify(`
        precision mediump float;

        // From http://tuxedolabs.blogspot.com/2018/05/bokeh-depth-of-field-in-single-pass.html

        uniform sampler2D uTexture; //Image to be processed 
        uniform sampler2D uDepth; //Linear depth, where 1.0 == far plane 
        uniform vec2 uPixelSize; //The size of a pixel: vec2(1.0/width, 1.0/height) 
        uniform float cameraDistance;
        uniform mat4 proj;
        uniform float time;
        uniform vec2 resolution;

        #pragma glslify: fbm = require('../draw/fbm.glsl')

        const float GOLDEN_ANGLE = 2.39996323; 
        const float MAX_BLUR_SIZE = 12.;
        const float RAD_SCALE = 1.; // Smaller = nicer blur, larger = faster
        const float ITER = 10.;

        float getDepth(vec2 texCoord) {
          float depth = texture2D(uDepth, texCoord).r;
          depth = proj[3].z / (depth * -2. + 1. - proj[2].z);
          depth += cameraDistance;
          depth = -depth;
          return depth;
        }

        float getBlurSize(float depth, float focusPoint, float focusScale) {
          float coc = clamp((depth - focusPoint) / focusScale, -1., 1.);
          //return abs(coc);
          return abs(coc) * MAX_BLUR_SIZE / cameraDistance * 40.;
          //  return abs(coc) * MAX_BLUR_SIZE;
        }

        vec3 depthOfField(vec2 texCoord, vec2 move, float focusPoint, float focusScale) {
          float centerDepth = getDepth(texCoord);
          float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);
          vec3 color = texture2D(uTexture, texCoord).rgb;

          float tot = 1.;

          float radius = RAD_SCALE;
          float ang = 0.;

          //for (float ang = 0.; radius < MAX_BLUR_SIZE; ang += GOLDEN_ANGLE) {
          for (float i = 0.; i < ITER; i++) {

            if (radius >= MAX_BLUR_SIZE) {
              break;
            }

            vec2 tc = texCoord + (vec2(cos(ang), sin(ang)) + move * 200.) * uPixelSize * radius;
            // texCoord += fbm(vec3(texCoord * 150., time * 4.)) * uPixelSize * radius * 2.;
            // vec2 tc = texCoord;

            vec3 sampleColor = texture2D(uTexture, tc).rgb;
            float sampleDepth = getDepth(tc);
            float sampleSize = getBlurSize(sampleDepth, focusPoint, focusScale);

            if (sampleDepth > centerDepth)
              sampleSize = clamp(sampleSize, 0.0, centerSize*2.0);

            float m = smoothstep(radius-0.5, radius+0.5, sampleSize);
            color += mix(color/tot, sampleColor, m);
            tot += 1.0;
            radius += RAD_SCALE/radius;
            ang += GOLDEN_ANGLE;
          }

          return color /= tot;
        }

        void main() {
          vec2 xy = gl_FragCoord.xy;
          vec2 move = fbm(vec3(xy * .2, time * 4.)) * 2.5 / resolution;
          vec2 uv = gl_FragCoord.xy / resolution;
          gl_FragColor = vec4(depthOfField(uv, move, 0., 30.), 1);
        }`),
      uniforms: {
        uTexture: regl.prop('source'),
        uDepth: function(context, props) {
          return props.source.depthStencil;
        },
        resolution: function(context) {
          return [context.framebufferWidth, context.framebufferHeight];
        },
        uPixelSize: function(context) {
          var width = context.framebufferWidth;
          var height = context.framebufferHeight;
          var fit = Math.min(width, height) * .002;
          return [
            1 / width * fit,
            1 / height * fit
          ];
        },
        cameraDistance: function(context) {
          return camera.distance;
        },
        proj: camera._projection,
        time: regl.context('time')
      },
      framebuffer: regl.prop('destination')
    });
  }
}

module.exports = DofBlur;
