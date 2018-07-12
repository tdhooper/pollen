const mat4 = require('gl-mat4');
const fit = require('canvas-fit');
const normals = require('angle-normals');
const geometry = require('./geometry/polyhedra');
const WebcamTexture = require('./webcam-texture');

const canvas = document.body.appendChild(document.createElement('canvas'));
const regl = require('regl')(canvas);
const camera = require('canvas-orbit-camera')(canvas);
camera.distance = 10;

window.addEventListener('resize', fit(canvas), false);

var mesh;
mesh = geometry.icosahedron(5);
// mesh = geometry.tetrahedron(6);

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

const blurBuffers = [0,0].map(function() {
  return regl.framebuffer({
    depth: false,
    color: regl.texture({
      width: 32,
      height: 32,
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
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      gl_FragColor = texture2D(source, uv);
    }`,
  uniforms: {
    direction: regl.prop('direction'),
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});

const blurPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 direction;
    uniform vec2 resolution;

    vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
      vec4 color = vec4(0.0);
      vec2 off1 = vec2(1.411764705882353) * direction;
      vec2 off2 = vec2(3.2941176470588234) * direction;
      vec2 off3 = vec2(5.176470588235294) * direction;
      color += texture2D(image, uv) * 0.1964825501511404;
      color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;
      color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;
      color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;
      color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;
      color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;
      color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;
      return color;
    }

    void main() {
      vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
      gl_FragColor = blur13(source, uv, resolution.xy, direction);
    }`,
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
})

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
      destination: blurBuffers[0]
    });
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
    heightMapPass({
      source: blurBuffers[0],
      destination: blurBuffers[1]
    });
  });
  drawSphere({
    heightMap: blurBuffers[1],
    video: webcam.texture
  });
})