const mat4 = require('gl-mat4');
const glslify = require('glslify');
const createRegl = require('regl');
const createCamera = require('canvas-orbit-camera');

const canvas = document.body.appendChild(document.createElement('canvas'));
global.regl = createRegl(canvas);

const geometry = require('./geometry/polyhedra');
const setupPass = require('./draw/setup-pass');
const resamplePass = require('./draw/resample-pass');
const blurPass = require('./draw/blur-pass');
const heightMapPass = require('./draw/height-map-pass');
const drawSphere = require('./draw/sphere');
const drawVideo = require('./draw/video');
const WebcamTexture = require('./webcam-texture');
const glm = require('gl-matrix');


const camera = createCamera(canvas);
camera.distance = 10;

var resize = function() {
  var width = document.body.clientWidth;
  var height = document.body.clientHeight;
  canvas.width = width;
  canvas.height = height;
};

window.addEventListener('resize', resize, false);

resize();

var noop = function(evt) {
  evt.preventDefault();
};

canvas.addEventListener('touchstart', noop, false);
canvas.addEventListener('touchmove', noop, false);
canvas.addEventListener('touchend', noop, false);

var abcUv = [
  [1, 1],
  [0, 1],
  [1, 0]
];

var mesh;
//mesh = geometry.icosahedron(5, abcUv);
mesh = geometry.tetrahedron(6, abcUv);

var webcam = new WebcamTexture(regl);

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

var diffSize = 6;

const diffSourceBuffer = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: diffSize,
    height: diffSize
  })
});

const diffBuffer = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: diffSize * diffSize,
    height: diffSize * diffSize
  })
});

const diffReduceABuffer = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: diffSize * diffSize,
    height: 1
  })
});

const diffReduceBBuffer = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: 1,
    height: 1
  })
});

const diffResultBuffer = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: 2,
    height: 1
  })
});


var videoMat = glm.mat3.create();
var videoScale = -4;
var videoTranslate = .5 / videoScale - .5;
glm.mat3.scale(videoMat, videoMat, [videoScale, videoScale]);
glm.mat3.translate(videoMat, videoMat, [videoTranslate, videoTranslate]);
glm.mat3.invert(videoMat, videoMat);

var previewMat = glm.mat3.create();
glm.mat3.scale(previewMat, previewMat, [.2, .2]);
glm.mat3.translate(previewMat, previewMat, [.1, .1]);
glm.mat3.invert(previewMat, previewMat);

var previewMatViewport = glm.mat3.create();



const differencesPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 sourceSize;
    uniform vec2 direction;

    void main() {
      vec2 ab = gl_FragCoord.xy;
      vec2 uvA = vec2(
        mod(ab.x, sourceSize.x),
        floor(ab.x / sourceSize.x)
      );
      vec2 uvB = vec2(
        mod(ab.y, sourceSize.x),
        floor(ab.y / sourceSize.x)
      );
      vec3 a = texture2D(source, uvA / sourceSize).rgb;
      vec3 b = texture2D(source, uvB / sourceSize).rgb;
      float difference = distance(a, b) / 2.;
      gl_FragColor = vec4(difference, ab / 255., 1);
    }`,
  uniforms: {
    source: regl.prop('source'),
    sourceSize: function(context, props) {
      return [props.source.width, props.source.height];
    }
  },
  framebuffer: regl.prop('destination')
});

const maxDifferencesPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 sourceSize;

    void main() {
      vec2 uv;
      vec3 maxData = vec3(0);
      for (float i = 0.; i < ${ diffSize * diffSize }.; i++) {
        uv = vec2(gl_FragCoord.x, i);
        vec3 data = texture2D(source, uv / sourceSize).rgb;
        if (data.r > maxData.r) {
          maxData = data;
        }
      }
      gl_FragColor = vec4(maxData, 1);
    }`,
  uniforms: {
    direction: regl.prop('direction'),
    source: regl.prop('source'),
    sourceSize: function(context, props) {
      return [props.source.width, props.source.height];
    }
  },
  framebuffer: regl.prop('destination')
});

const resultPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D result;
    uniform sampler2D source;
    uniform vec2 sourceSize;
    uniform vec2 resolution;

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      vec2 ab = texture2D(result, vec2(0)).gb;
      ab *= 255.;
      vec2 uvA = vec2(
        mod(ab.x, sourceSize.x),
        floor(ab.x / sourceSize.x)
      );
      vec2 uvB = vec2(
        mod(ab.y, sourceSize.x),
        floor(ab.y / sourceSize.x)
      );
      if (uv.x > .5) {
        gl_FragColor = texture2D(source, uvA / sourceSize);
      } else {
        gl_FragColor = texture2D(source, uvB / sourceSize);
      }
    }`,
  uniforms: {
    direction: regl.prop('direction'),
    result: regl.prop('result'),
    source: regl.prop('source'),
    sourceSize: function(context, props) {
      return [props.source.width, props.source.height];
    },
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});


regl.frame((context) => {
  regl.clear({
    color: [.8, .82, .85, 1]
  })
  camera.rotate([.003,0.002],[0,0]);
  camera.tick();
  webcam.update();
  setupPass(function() {
    resamplePass({
      source: webcam.texture,
      destination: croppedVideo,
      transform: videoMat
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

    resamplePass({
      source: blurBuffers[0],
      destination: diffSourceBuffer
    });
    differencesPass({
      source: diffSourceBuffer,
      destination: diffBuffer
    });
    maxDifferencesPass({
      source: diffBuffer,
      destination: diffReduceABuffer
    });
    maxDifferencesPass({
      source: diffReduceABuffer,
      destination: diffReduceBBuffer
    });
    resultPass({
      result: diffReduceBBuffer,
      source: diffSourceBuffer,
      destination: diffResultBuffer
    });


    heightMapPass({
      difference: diffResultBuffer,
      source: blurBuffers[0],
      destination: blurBuffers[1]
    });
    // resamplePass({
    //   source: blurBuffers[1]
    // });
  });
  drawSphere({
    heightMap: blurBuffers[1],
    video: croppedVideo,
    view: camera.view(),
    mesh: mesh
  });
  var ratio = context.drawingBufferWidth / context.drawingBufferHeight;
  glm.mat3.scale(previewMatViewport, previewMat, [ratio, 1]);
  setupPass(function() {
    drawVideo({
      source: croppedVideo,
      transform: previewMatViewport,
      abcUv: abcUv
    });
  })
})
