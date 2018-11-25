
class DofPass {

  constructor(camera) {

    this.draw = regl({
      frag: `
        precision mediump float;

        uniform sampler2D uTexture; //Image to be processed 
        uniform sampler2D uDepth; //Linear depth, where 1.0 == far plane 
        uniform vec2 uPixelSize; //The size of a pixel: vec2(1.0/width, 1.0/height) 
        uniform float cameraDistance;
        uniform mat4 proj;

        const float GOLDEN_ANGLE = 2.39996323; 
        const float MAX_BLUR_SIZE = 12.;
        const float ITER = 50.;

        float getDepth(vec2 texCoord) {
          float depth = texture2D(uDepth, texCoord).r;
          depth = proj[3].z / (depth * -2. + 1. - proj[2].z);
          depth += cameraDistance;
          depth = -depth;
          return depth;
        }

        float getBlurSize(float depth, float focusPoint, float focusScale)
        {
          float coc = clamp((depth - focusPoint) / focusScale, -1., 1.);
          //return abs(coc);
          return abs(coc) * MAX_BLUR_SIZE / cameraDistance * 40.;
        }

        vec3 depthOfField(vec2 texCoord, float focusPoint, float focusScale)
        {
          float centerDepth = getDepth(texCoord);
          float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);
          //return vec3(centerSize);
          vec3 color = texture2D(uTexture, texCoord).rgb;
          // return color;
          float tot = 1.;
          float radius;
          float ang = 0.;
          float SQ_ITER = sqrt(ITER);

          for (float i = 0.; i < ITER; i++) {
            ang += GOLDEN_ANGLE;
            radius = sqrt(i) / SQ_ITER * MAX_BLUR_SIZE;
            vec2 tc = texCoord + vec2(cos(ang), sin(ang)) * uPixelSize * radius;
            vec3 sampleColor = texture2D(uTexture, tc).rgb;
            float sampleDepth = getDepth(tc);
            float sampleSize = getBlurSize(sampleDepth, focusPoint, focusScale);
            if (sampleDepth > centerDepth)
              sampleSize = clamp(sampleSize, 0.0, centerSize*2.0);
            float m = smoothstep(radius-0.5, radius+0.5, sampleSize);
            color += mix(color/tot, sampleColor, m);
            tot += 1.0;
          }
          return color /= tot;
        }

        uniform vec2 resolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;
          gl_FragColor = vec4(depthOfField(uv, -.2, 8.), 1);
        }`,
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
        proj: function(context, props) {
          return camera.projection(
            context.viewportWidth,
            context.viewportHeight
          );
        }
      },
      framebuffer: regl.prop('destination')
    });
  }
}

module.exports = DofPass;