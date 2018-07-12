const mat4 = require('gl-mat4');
const fit = require('canvas-fit');
const normals = require('angle-normals');
const glslify = require('glslify');
const geometry = require('./geometry/polyhedra');
const WebcamTexture = require('./webcam-texture');

const canvas = document.body.appendChild(document.createElement('canvas'));
const regl = require('regl')(canvas);
const camera = require('canvas-orbit-camera')(canvas);
camera.distance = 10;

window.addEventListener('resize', fit(canvas), false);

var mesh;
// mesh = geometry.icosahedron(5);
mesh = geometry.tetrahedron(6);

var webcam = new WebcamTexture(regl);

var o = [0,0,0];
var i = [255,255,255];

var debugTexture = regl.texture({
  data: [
    [i,i,i],
    [i,o,i],
    [i,i,i]
  ],
  mag: 'linear'
});

var croppedVideo = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: 1024,
    height: 1024,
    mag: 'linear',
    min: 'linear'
  })
});

const blurBuffers = [0,0].map(function() {
  return regl.framebuffer({
    depth: false,
    color: regl.texture({
      width: 64,
      height: 64,
      mag: 'linear'
    })
  });
});

const setupPass = regl({
  vert: `
    precision mediump float;
    attribute vec2 position;
    void main () {
      gl_Position = vec4(2. * position - 1., 0, 1);
    }`,
  attributes: {
    position: [
      -2, 0,
      0, -2,
      2, 2
    ],
  },
  count: 3,
});

const resamplePass = regl({
  frag: glslify(`
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform vec4 area;

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      vec2 areaUv = mix(area.xy, area.zw, uv);
      gl_FragColor = texture2D(source, areaUv);
    }`),
  uniforms: {
    direction: regl.prop('direction'),
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    },
    area: function(context, props) {
      return props.hasOwnProperty('area') ? props.area : [0,0,1,1];
    }
  },
  framebuffer: regl.prop('destination')
});

const blurPass = regl({
  frag: glslify(`
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 direction;
    uniform vec2 resolution;

    #pragma glslify: blur = require('glsl-fast-gaussian-blur/13')

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      gl_FragColor = blur(source, uv, resolution.xy, direction);
    }`),
  uniforms: {
    direction: regl.prop('direction'),
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});

const heightMapPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;

    void main () {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      vec3 tex = texture2D(source, uv).rgb;
      float height = length(tex);
      height = pow(height, 2.);
      gl_FragColor = vec4(vec3(height), 1);
      // gl_FragColor = vec4(tex, 1);
    }`,
  uniforms: {
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});

const drawSphere = regl({
  frag: `
    precision mediump float;
    varying vec3 vnormal;
    varying vec2 vuv;
    //varying float height;
    uniform sampler2D video;
    uniform sampler2D heightMap;
    void main () {
        vec3 tex = texture2D(video, vec2(1) - vuv).rgb;
        gl_FragColor = vec4(tex, 1);
        // vec3 height = texture2D(heightMap, vec2(1) - vuv).rgb;
        // gl_FragColor = vec4(vec3(height), 1);
        // gl_FragColor = vec4(vnormal * .5 + .5, 1.0);
    }`,
  vert: `
    precision mediump float;
    uniform mat4 proj;
    uniform mat4 model;
    uniform mat4 view;
    uniform sampler2D heightMap;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    varying vec3 vnormal;
    varying vec2 vuv;
    varying float height;
    void main () {
      vnormal = normal;
      vuv = uv;
      height = texture2D(heightMap, vec2(1) - vuv).r;
      vec3 pos = position;
      pos *= mix(.5, 1., height);
      gl_Position = proj * view * model * vec4(pos, 1.0);
    }`,
  attributes: {
    position: mesh.positions,
    normal: normals(mesh.cells, mesh.positions),
    uv: mesh.uvs
  },
  elements: mesh.cells,
  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
        Math.PI / 10,
        viewportWidth / viewportHeight,
        0.01,
        1000),
    model: mat4.identity([]),
    view: () => camera.view(),
    video: regl.prop('video'),
    heightMap: regl.prop('heightMap')
  }
});

const drawVideo = regl({
  frag: glslify(`
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform vec4 area;

    #pragma glslify: range = require('glsl-range')

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      if (uv.x < area.x || uv.x > area.z || uv.y < area.y || uv.y > area.w) {
        discard;
      }
      vec2 areaUv = range(area.xy, area.zw, uv);
      gl_FragColor = texture2D(source, areaUv);
    }`),
  uniforms: {
    source: regl.prop('source'),
    area: regl.prop('area'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  }
});

regl.frame(() => {
  regl.clear({
    color: [.8, .82, .85, 1]
  })
  camera.rotate([.003,0.002],[0,0]);
  camera.tick()
  webcam.update();
  setupPass(function() {
    resamplePass({
      source: webcam.texture,
      destination: croppedVideo,
      area: [.33, .33, .66, .66]
    });
    resamplePass({
      source: croppedVideo,
      destination: blurBuffers[0]
    });
    var i = 0;
    while (i < 3) {
      blurPass({
        source: blurBuffers[0],
        destination: blurBuffers[1],
        direction: [1,0]
      });
      blurPass({
        source: blurBuffers[1],
        destination: blurBuffers[0],
        direction: [0,1]
      });
      i += 1;
    }
    heightMapPass({
      source: blurBuffers[0],
      destination: blurBuffers[1]
    });
  });
  drawSphere({
    heightMap: blurBuffers[1],
    video: croppedVideo
  });
  setupPass(function() {
    drawVideo({
      source: blurBuffers[0],
      area: [
        .75, .75,
        1., 1.
      ]
    });
  })
})
