const glslify = require('glslify');


const depthPass = regl({
  frag: glslify(`
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform float cameraDistance;
    uniform mat4 proj;

    float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
      return ( viewZ + near ) / ( near - far );
    }

    float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
      return ( near * far ) / ( ( far - near ) * invClipZ - far );
    }
 
    float range(float vmin, float vmax, float value) {
      return (value - vmin) / (vmax - vmin);
    }

    float readDepth( sampler2D depthSampler, vec2 coord ) {
      float fragCoordZ = texture2D(depthSampler, coord).x;
// return mod(abs(fragCoordZ), .001) / .001;


      fragCoordZ = proj[3].z / (fragCoordZ * -2. + 1. - proj[2].z);
      fragCoordZ += cameraDistance;
      return 1. - fragCoordZ;

      // return range(0.98, 1., fragCoordZ);
      float cameraNear = 0.01;
      float cameraFar = 1.;
      float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
      float Z = viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
      return mod(Z, .01) / .01;
    }

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      float depth = readDepth(source, uv);
      gl_FragColor = vec4(vec3(depth), 1);
    }`),
  uniforms: {
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    },
    cameraDistance: function(context) {
      return context.camera.distance;
    },
    proj: regl.context('proj')
  },
  framebuffer: regl.prop('destination')
});

module.exports = depthPass;
