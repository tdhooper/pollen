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
const Quantize = require('./quantize');
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

var diffSize = 4;

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
    width: 2 * 128,
    height: 128
  })
});

const diffResultStripBuffer = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: diffSize * diffSize * 128,
    height: 128
  })
});


const stripBuffer = regl.framebuffer({
  depth: false,
  color: regl.texture({
    width: diffSize * diffSize,
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

const stripPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 sourceSize;
    uniform vec2 resolution;

    void main() {
      vec2 ab = gl_FragCoord.xy / resolution;
      ab *= sourceSize.x * sourceSize.y;
      vec2 uv = vec2(
        mod(ab.x, sourceSize.x) / sourceSize.x,
        floor(ab.x / sourceSize.x) / (sourceSize.y - 1.)
      );
      gl_FragColor = texture2D(source, uv);
      // gl_FragColor = vec4(vec3(floor(ab.x / sourceSize.x) / (sourceSize.y - 1.)), 1);
    }`,
  uniforms: {
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


const differencesPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 sourceSize;
    uniform vec2 direction;
    uniform vec2 resolution;

    void main() {
      vec2 ab = gl_FragCoord.xy / resolution;
      ab *= sourceSize.x * sourceSize.y;
      vec2 uvA = vec2(
        mod(ab.x, sourceSize.x) / sourceSize.x,
        floor(ab.x / sourceSize.x) / (sourceSize.y - 1.)
      );
      vec2 uvB = vec2(
        mod(ab.y, sourceSize.x) / sourceSize.x,
        floor(ab.y / sourceSize.x) / (sourceSize.y - 1.)
      );

      vec3 a = texture2D(source, uvA).rgb;
      vec3 b = texture2D(source, uvB).rgb;
      float difference = distance(a, b) / 2.;
      gl_FragColor = vec4(
        difference,
        gl_FragCoord.xy / resolution,
        1
      );
      // if (ab.y == 0.) {
      //   gl_FragColor = vec4(a, 1);
      // }
      // if (ab.x == 0.) {
      //   gl_FragColor = vec4(b, 1);
      // }
      
    }`,
  uniforms: {
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

const maxDifferencesPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 sourceSize;
    uniform vec2 resolution;

    void main() {
      vec2 uv;
      uv.y = gl_FragCoord.x / resolution.x;
      vec3 maxData = vec3(0);
      for (float i = 0.; i < ${ diffSize * diffSize }.; i++) {
        uv.x = i / sourceSize.x;
        vec3 data = texture2D(source, uv).rgb;
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
    },
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    }
  },
  framebuffer: regl.prop('destination')
});

const differencesDisplayPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D source;
    uniform vec2 resolution;
    uniform mat3 transform;

    vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
      return a + b*cos( 6.28318*(c*t+d) );
    }

    vec3 spectrum(float n) {
      return pal( n, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67) );
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      uv = (transform * vec3(uv, 1)).xy;
      if (uv.x > 1. || uv.y > 1. || uv.x < 0. || uv.y < 0.) {
        discard;
      }
      float difference = texture2D(source, uv).r;
      gl_FragColor = vec4(spectrum(difference), 1);
    }`,
  uniforms: {
    source: regl.prop('source'),
    resolution: function(context) {
      return [context.framebufferWidth, context.framebufferHeight];
    },
    transform: function(context, props) {
      return props.hasOwnProperty('transform') ? props.transform : identity;
    }
  },
  framebuffer: regl.prop('destination')
});

const resultPass = regl({
  frag: `
    precision mediump float;
    uniform sampler2D result;
    uniform vec2 resultSize;
    uniform sampler2D source;
    uniform vec2 sourceSize;
    uniform vec2 resolution;

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      vec2 ab = texture2D(result, uv).gb;
      // ab *= 255.;
      // ab = floor(ab);
      ab *= sourceSize.x * sourceSize.y;
      vec2 uvA = vec2(
        mod(ab.x, sourceSize.x) / sourceSize.x,
        floor(ab.x / sourceSize.x) / (sourceSize.y - 1.)
        // ab.x,0.
      );
      vec2 uvB = vec2(
        mod(ab.y, sourceSize.x) / sourceSize.x,
        floor(ab.y / sourceSize.x) / (sourceSize.y - 1.)
        // ab.y,0.
      );

      vec3 a = texture2D(source, uvA).rgb;
      vec3 b = texture2D(source, uvB).rgb;

      // uv.x = fract(uv.x * resultSize.x);

      if (uv.y < .5) {
        gl_FragColor = vec4(a, 1);
      } else {
        gl_FragColor = vec4(b, 1);
      }

      // gl_FragColor = texture2D(result, uv);
    }`,
  uniforms: {
    direction: regl.prop('direction'),
    result: regl.prop('result'),
    resultSize: function(context, props) {
      return [props.result.width, props.result.height];
    },
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


var slots = [
  [1/3, 1/2, 0, 1/2],
  [1/3, 1/2, 1/3, 1/2],
  [1/3, 1/2, 2/3, 1/2],
  [1/3, 1/2, 0, 0],
  [1/3, 1/2, 1/3, 0],
  [1/3, 1/2, 2/3, 0]
];
slots = slots.map(function(slot) {
  var full = glm.mat3.create();
  glm.mat3.translate(full, full, slot.slice(2));
  glm.mat3.scale(full, full, slot.slice(0, 2));
  glm.mat3.invert(full, full);

  var inner = glm.mat3.create();
  glm.mat3.translate(inner, inner,
    [
      slot[2] + (1/3) / (diffSize*diffSize),
      slot[3] + (1/2) / (diffSize*diffSize)
    ]
  );
  glm.mat3.scale(inner, inner,
    [
      slot[0] - (1/3) / (diffSize*diffSize),
      slot[1] - (1/2) / (diffSize*diffSize)
    ]
  );
  glm.mat3.invert(inner, inner);


  var bottom = glm.mat3.create();
  glm.mat3.translate(bottom, bottom,
    [
      slot[2] + (1/3) / (diffSize*diffSize),
      slot[3]
    ]
  );
  glm.mat3.scale(bottom, bottom,
    [
      slot[0] - (1/3) / (diffSize*diffSize),
      slot[1] / (diffSize*diffSize)
    ]
  );
  glm.mat3.invert(bottom, bottom);

  var left = glm.mat3.create();
  glm.mat3.rotate(left, left, Math.PI / 2);
  glm.mat3.translate(left, left,
    [
      slot[3] + (1/2) / (diffSize*diffSize),
      -slot[2] - (1/3) / (diffSize*diffSize)
    ]
  );
  glm.mat3.scale(left, left,
    [
      slot[1] - (1/2) / (diffSize*diffSize),
      slot[0] / (diffSize*diffSize)
    ]
  );
  glm.mat3.invert(left, left);

  return {
    full: full,
    inner: inner,
    left: left,
    bottom: bottom
  };
});

var quantize = new Quantize(diffSourceBuffer, 4);

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


    // heightMapPass({
    //   difference: diffResultBuffer,
    //   source: blurBuffers[0],
    //   destination: blurBuffers[1]
    // });

    var result = quantize.process();

    resamplePass({
      source: croppedVideo,
      transform: slots[0].full
    });
    resamplePass({
      source: diffSourceBuffer,
      transform: slots[1].full
    });
    resamplePass({
      source: result,
      transform: slots[5].full
    });
  });
  // drawSphere({
  //   heightMap: blurBuffers[1],
  //   video: croppedVideo,
  //   view: camera.view(),
  //   mesh: mesh
  // });
  // var ratio = context.drawingBufferWidth / context.drawingBufferHeight;
  // glm.mat3.scale(previewMatViewport, previewMat, [ratio, 1]);
  // setupPass(function() {
  //   drawVideo({
  //     source: croppedVideo,
  //     transform: previewMatViewport,
  //     abcUv: abcUv
  //   });
  // })
})
