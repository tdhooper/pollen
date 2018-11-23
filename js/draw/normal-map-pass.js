
const heightMapPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform mat4 iModel;
    uniform mat4 iModelInv;

    float getHeight(vec2 uv) {
      float height = texture2D(source, uv).r;
      height = mix(.5, 1., height);
      return height;
    }

    vec3 getPosAt(vec4 pos4, vec2 uv, vec2 offset) {
      pos4 = iModel * (pos4 + vec4(offset.x, 0, offset.y, 0));
      float height = getHeight(uv + offset);
      pos4 = vec4(normalize(pos4.xyz) * height, 1);
      pos4 = iModelInv * pos4;
      return pos4.xyz;
    }

    vec3 getNormal(vec4 pos4, vec2 uv) {
      float eps = .01;
      vec3 p = getPosAt(pos4, uv, vec2(0));
      vec3 x = getPosAt(pos4, uv, vec2(eps,0));
      vec3 y = getPosAt(pos4, uv, vec2(0,eps));

      vec3 t = normalize(p - x);
      vec3 b = normalize(p - y);

      vec3 normal = normalize(cross(b, t));
      return normal;
    }

    void main () {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);

      vec4 pos4 = vec4(uv.x, 0, uv.y, 1);

      vec3 normal = normalize(getNormal(pos4, uv));

      normal = normal * .5 + .5;

      gl_FragColor = vec4(normal, 1);
    }`,
  uniforms: {
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    },
    iModel: function(context, props) {
      return props.iModel;
    },
    iModelInv: function(context, props) {
      return props.iModelInv;
    }
  },
  framebuffer: regl.prop('destination')
});

module.exports = heightMapPass;
