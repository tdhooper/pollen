const glslify = require('glslify');


const depthPass = regl({
  frag: glslify(`
    precision mediump float;

    uniform sampler2D uTexture; //Image to be processed 
    uniform sampler2D uDepth; //Linear depth, where 1.0 == far plane 
    uniform vec2 uPixelSize; //The size of a pixel: vec2(1.0/width, 1.0/height) 
    uniform float cameraDistance;
    uniform mat4 proj;

    const float GOLDEN_ANGLE = 2.39996323; 
    const float MAX_BLUR_SIZE = 40.0; 
    const float RAD_SCALE = 0.75; // Smaller = nicer blur, larger = faster

    //for (float ang = 0.0; radius<MAX_BLUR_SIZE; ang += GOLDEN_ANGLE)
    //radius += RAD_SCALE/radius;
    const int ITER = 20;

    float getDepth(vec2 texCoord) {
      float depth = texture2D(uDepth, texCoord).r;
      depth = proj[3].z / (depth * -2. + 1. - proj[2].z);
      depth += cameraDistance;
      depth = -depth;
      return depth;
    }

    float getBlurSize(float depth, float focusPoint, float focusScale)
    {
      // float coc = clamp((1.0 / focusPoint - 1.0 / depth)*focusScale, -1.0, 1.0);
      float coc = (depth - focusPoint) / focusScale;
      return abs(coc) * MAX_BLUR_SIZE / cameraDistance * 10.;
    }

    vec3 depthOfField(vec2 texCoord, float focusPoint, float focusScale)
    {
      float centerDepth = getDepth(texCoord);
      float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);
      vec3 color = texture2D(uTexture, texCoord).rgb;
      float tot = 1.0;
      float radius = RAD_SCALE;
      float ang = 0.;
      for (int i = 0; i<ITER; i++)
      {
        ang += GOLDEN_ANGLE;
        vec2 tc = texCoord + vec2(cos(ang), sin(ang)) * uPixelSize * radius;
        vec3 sampleColor = texture2D(uTexture, tc).rgb;
        float sampleDepth = getDepth(tc);
        float sampleSize = getBlurSize(sampleDepth, focusPoint, focusScale);
        if (sampleDepth > centerDepth)
          sampleSize = clamp(sampleSize, 0.0, centerSize*2.0);
        float m = smoothstep(radius-0.5, radius+0.5, sampleSize);
        color += mix(color/tot, sampleColor, m);
        tot += 1.0;
        radius += RAD_SCALE/radius;
      }
      return color /= tot;
    }

    uniform vec2 resolution;

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      gl_FragColor = vec4(depthOfField(uv, -.5, 1.5), 1);
    }`),
  uniforms: {
    uTexture: regl.prop('source'),
    uDepth: regl.prop('depth'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    },
    uPixelSize: function(context) {
      return [1/context.framebufferWidth, 1/context.framebufferHeight];
    },
    cameraDistance: function(context) {
      return context.camera.distance;
    },
    proj: regl.context('proj')
  },
  framebuffer: regl.prop('destination')
});

module.exports = depthPass;
