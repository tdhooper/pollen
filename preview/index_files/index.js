(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

function IndexCache(itemFactory, items) {
    this.items = items || [];
    this.indexMap = {};
    this.itemFactory = itemFactory;
}

IndexCache.prototype.get = function() {
    var key = this.getKey.apply(this, arguments);
    if (this.indexMap.hasOwnProperty(key)) {
        return this.indexMap[key];
    }
    var item = this.itemFactory.apply(this, arguments);
    this.items.push(item);
    var index = this.items.length - 1;
    this.indexMap[key] = index;
    return index;
};

IndexCache.prototype.getKey = function() {
    return [].slice.call(arguments).sort().join(',');
};

module.exports = IndexCache;

},{}],2:[function(require,module,exports){
var normalize = require('vectors/normalize-nd');
var polyhedra = require('polyhedra');
var schwarz = require('./schwarz');
var subdivide = require('./subdivide');

function create(poly, subdivisions) {
    var cells = poly.face.slice();
    var positions = poly.vertex.slice();
    positions.forEach(normalize);
    var complex = {
        cells: cells,
        positions: positions
    };
    complex = schwarz(complex);
    while (subdivisions-- > 0) {
        complex = subdivide(complex);
    }
    return complex;
}

module.exports = {
    icosahedron: create.bind(this, polyhedra.platonic.Icosahedron),
    tetrahedron: create.bind(this, polyhedra.platonic.Tetrahedron)
};

},{"./schwarz":3,"./subdivide":4,"polyhedra":51,"vectors/normalize-nd":55}],3:[function(require,module,exports){
var normalize = require('vectors/normalize-nd');
var IndexCache = require('./index-cache');


function schwarz(complex) {
    var positions = complex.positions.slice();
    var cells = complex.cells;
    var newCells = [];

    var positionsUvs = positions.map(function(position) {
        return {
            position: position,
            uv: [0, 0]
        };
    });

    var positionsUvsCache = new IndexCache(
        createMidpoint.bind(this, positionsUvs),
        positionsUvs
    );

    cells.forEach(function(cell) {
        var a = cell[0];
        var b = cell[1];
        var c = cell[2];
        var center = positionsUvsCache.get(a, b, c);
        var ab = positionsUvsCache.get(a, b);
        var bc = positionsUvsCache.get(b, c);
        var ca = positionsUvsCache.get(c, a);
        newCells.push([a, ab, center]);
        newCells.push([ab, b, center]);
        newCells.push([b, bc, center]);
        newCells.push([bc, c, center]);
        newCells.push([c, ca, center]);
        newCells.push([ca, a, center]);
    });

    return {
        cells: newCells,
        positions: positionsUvs.map(function(puv) { return puv.position; }),
        uvs: positionsUvs.map(function(puv) { return puv.uv; })
    };
}

function createMidpoint(positionsUvs, a, b, c) {
    var indicies = [a, b];
    if (c !== undefined) {
        indicies.push(c);
    }

    var midpoint = indicies.reduce(function(acc, current) {
        var position = positionsUvs[current].position;
        acc[0] += position[0];
        acc[1] += position[1];
        acc[2] += position[2];
        return acc;
    }, [0, 0, 0]);

    normalize(midpoint);

    var positionUv = {
        position: midpoint,
        uv: c !== undefined ? [1, 1] : [1, 0]
    };

    return positionUv;
}

module.exports = schwarz;

},{"./index-cache":1,"vectors/normalize-nd":55}],4:[function(require,module,exports){
var normalize = require('vectors/normalize-nd');
var IndexCache = require('./index-cache');


function subdivide(complex) {
    var positions = complex.positions.slice();
    var uvs = complex.uvs.slice();
    var cells = complex.cells;
    var newCells = [];

    var positionsCache = new IndexCache(
        createMidpoint.bind(this, positions),
        positions
    );

    var uvsCache = new IndexCache(
        createMidpointUv.bind(this, uvs),
        uvs
    );

    cells.forEach(function(cell) {
        var a = cell[0];
        var b = cell[1];
        var c = cell[2];

        var ab = positionsCache.get(a, b);
        var bc = positionsCache.get(b, c);
        var ca = positionsCache.get(c, a);

        uvsCache.get(a, b);
        uvsCache.get(b, c);
        uvsCache.get(c, a);

        newCells.push([a, ab, ca]);
        newCells.push([b, bc, ab]);
        newCells.push([c, ca, bc]);
        newCells.push([ab, bc, ca]);
    });

    return {
        cells: newCells,
        positions: positions,
        uvs: uvs
    };
}

function createMidpoint(positions, a, b) {
    var va = positions[a];
    var vb = positions[b];
    var v = [
        va[0] + vb[0],
        va[1] + vb[1],
        va[2] + vb[2]
    ];
    normalize(v);
    return v;
}

function createMidpointUv(uvs, a, b) {
    var va = uvs[a];
    var vb = uvs[b];
    var v = [
        (va[0] + vb[0]) / 2,
        (va[1] + vb[1]) / 2
    ];
    return v;
}

module.exports = subdivide;

},{"./index-cache":1,"vectors/normalize-nd":55}],5:[function(require,module,exports){
const mat4 = require('gl-mat4');
const fit = require('canvas-fit');
const normals = require('angle-normals');
const geometry = require('./geometry/polyhedra');

const canvas = document.body.appendChild(document.createElement('canvas'));
const regl = require('regl')(canvas);
const camera = require('canvas-orbit-camera')(canvas);
camera.distance = 10;

window.addEventListener('resize', fit(canvas), false);

var mesh;
mesh = geometry.icosahedron(2);
// mesh = geometry.tetrahedron(3);

var videoReady = false;
var video = document.createElement('video');
video.width = 200;
video.autoplay = true;
video.controls = true;
video.setAttribute('playsinline', 'playsinline');
document.body.appendChild(video);
var videoTexture = regl.texture();

var constraints = {
    video: {
        facingMode: 'environment'
    }
};
navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
        video.srcObject = mediaStream;
        video.onloadedmetadata = function(e) {
            video.play();
            videoTexture(video);
            videoReady = true;
        };
    })
    .catch(function(err) {
        console.log(err.name + ": " + err.message);
    });


const drawSphere = regl({
  frag: `
    precision mediump float;
    varying vec3 vnormal;
    varying vec2 vuv;
    uniform sampler2D video;
    void main () {
        vec3 tex = texture2D(video, vec2(1) - vuv).rgb;
        gl_FragColor = vec4(tex, 1);
        // gl_FragColor = vec4(vnormal * .5 + .5, 1.0);
    }`,
  vert: `
    precision mediump float;
    uniform mat4 proj;
    uniform mat4 model;
    uniform mat4 view;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    varying vec3 vnormal;
    varying vec2 vuv;
    void main () {
      vnormal = normal;
      vuv = uv;
      gl_Position = proj * view * model * vec4(position, 1.0);
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
    video: videoTexture
  }
})

regl.frame(() => {
  regl.clear({
    color: [.8, .82, .85, 1]
  })
  camera.rotate([.003,0.002],[0,0]);
  camera.tick()
  if (videoReady) {
    videoTexture.subimage(video);
  }
  drawSphere()
})

},{"./geometry/polyhedra":2,"angle-normals":6,"canvas-fit":7,"canvas-orbit-camera":8,"gl-mat4":26,"regl":53}],6:[function(require,module,exports){
'use strict'

module.exports = angleNormals

function hypot(x, y, z) {
  return Math.sqrt(Math.pow(x,2) + Math.pow(y,2) + Math.pow(z,2))
}

function weight(s, r, a) {
  return Math.atan2(r, (s - a))
}

function mulAdd(dest, s, x, y, z) {
  dest[0] += s * x
  dest[1] += s * y
  dest[2] += s * z
}

function angleNormals(cells, positions) {
  var numVerts = positions.length
  var numCells = cells.length

  //Allocate normal array
  var normals = new Array(numVerts)
  for(var i=0; i<numVerts; ++i) {
    normals[i] = [0,0,0]
  }

  //Scan cells, and
  for(var i=0; i<numCells; ++i) {
    var cell = cells[i]
    var a = positions[cell[0]]
    var b = positions[cell[1]]
    var c = positions[cell[2]]

    var abx = a[0] - b[0]
    var aby = a[1] - b[1]
    var abz = a[2] - b[2]
    var ab = hypot(abx, aby, abz)

    var bcx = b[0] - c[0]
    var bcy = b[1] - c[1]
    var bcz = b[2] - c[2]
    var bc = hypot(bcx, bcy, bcz)

    var cax = c[0] - a[0]
    var cay = c[1] - a[1]
    var caz = c[2] - a[2]
    var ca = hypot(cax, cay, caz)

    if(Math.min(ab, bc, ca) < 1e-6) {
      continue
    }

    var s = 0.5 * (ab + bc + ca)
    var r = Math.sqrt((s - ab)*(s - bc)*(s - ca)/s)

    var nx = aby * bcz - abz * bcy
    var ny = abz * bcx - abx * bcz
    var nz = abx * bcy - aby * bcx
    var nl = hypot(nx, ny, nz)
    nx /= nl
    ny /= nl
    nz /= nl

    mulAdd(normals[cell[0]], weight(s, r, bc), nx, ny, nz)
    mulAdd(normals[cell[1]], weight(s, r, ca), nx, ny, nz)
    mulAdd(normals[cell[2]], weight(s, r, ab), nx, ny, nz)
  }

  //Normalize all the normals
  for(var i=0; i<numVerts; ++i) {
    var n = normals[i]
    var l = Math.sqrt(
      Math.pow(n[0], 2) +
      Math.pow(n[1], 2) +
      Math.pow(n[2], 2))
    if(l < 1e-8) {
      n[0] = 1
      n[1] = 0
      n[2] = 0
      continue
    }
    n[0] /= l
    n[1] /= l
    n[2] /= l
  }

  return normals
}

},{}],7:[function(require,module,exports){
var size = require('element-size')

module.exports = fit

var scratch = new Float32Array(2)

function fit(canvas, parent, scale) {
  var isSVG = canvas.nodeName.toUpperCase() === 'SVG'

  canvas.style.position = canvas.style.position || 'absolute'
  canvas.style.top = 0
  canvas.style.left = 0

  resize.scale  = parseFloat(scale || 1)
  resize.parent = parent

  return resize()

  function resize() {
    var p = resize.parent || canvas.parentNode
    if (typeof p === 'function') {
      var dims   = p(scratch) || scratch
      var width  = dims[0]
      var height = dims[1]
    } else
    if (p && p !== document.body) {
      var psize  = size(p)
      var width  = psize[0]|0
      var height = psize[1]|0
    } else {
      var width  = window.innerWidth
      var height = window.innerHeight
    }

    if (isSVG) {
      canvas.setAttribute('width', width * resize.scale + 'px')
      canvas.setAttribute('height', height * resize.scale + 'px')
    } else {
      canvas.width = width * resize.scale
      canvas.height = height * resize.scale
    }

    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    return resize
  }
}

},{"element-size":9}],8:[function(require,module,exports){
var createCamera = require('orbit-camera')
var createScroll = require('scroll-speed')
var mp = require('mouse-position')
var mb = require('mouse-pressed')
var key = require('key-pressed')

var panSpeed = 1

module.exports = attachCamera

function attachCamera(canvas, opts) {
  opts = opts || {}
  opts.pan = opts.pan !== false
  opts.scale = opts.scale !== false
  opts.rotate = opts.rotate !== false

  var scroll = createScroll(canvas, opts.scale)
  var mbut = mb(canvas, opts.rotate)
  var mpos = mp(canvas)
  var camera = createCamera(
      [0, 10, 30]
    , [0, 0, 0]
    , [0, 1, 0]
  )

  camera.tick = tick

  return camera

  function tick() {
    var ctrl = key('<control>') || key('<alt>')
    var alt = key('<shift>')
    var height = canvas.height
    var width = canvas.width

    if (opts.rotate && mbut.left && !ctrl && !alt) {
      camera.rotate(
          [ mpos.x / width - 0.5, mpos.y / height - 0.5 ]
        , [ mpos.prevX / width - 0.5, mpos.prevY / height - 0.5 ]
      )
    }

    if (opts.pan && mbut.right || (mbut.left && ctrl && !alt)) {
      camera.pan([
          panSpeed * (mpos.x - mpos.prevX) / width
        , panSpeed * (mpos.y - mpos.prevY) / height
      ])
    }

    if (opts.scale && scroll[1]) {
      camera.distance *= Math.exp(scroll[1] / height)
    }

    if (opts.scale && (mbut.middle || (mbut.left && !ctrl && alt))) {
      var d = mpos.y - mpos.prevY
      if (!d) return;

      camera.distance *= Math.exp(d / height)
    }

    scroll.flush()
    mpos.flush()
  }
}

},{"key-pressed":42,"mouse-position":43,"mouse-pressed":44,"orbit-camera":45,"scroll-speed":54}],9:[function(require,module,exports){
module.exports = getSize

function getSize(element) {
  // Handle cases where the element is not already
  // attached to the DOM by briefly appending it
  // to document.body, and removing it again later.
  if (element === window || element === document.body) {
    return [window.innerWidth, window.innerHeight]
  }

  if (!element.parentNode) {
    var temporary = true
    document.body.appendChild(element)
  }

  var bounds = element.getBoundingClientRect()
  var styles = getComputedStyle(element)
  var height = (bounds.height|0)
    + parse(styles.getPropertyValue('margin-top'))
    + parse(styles.getPropertyValue('margin-bottom'))
  var width  = (bounds.width|0)
    + parse(styles.getPropertyValue('margin-left'))
    + parse(styles.getPropertyValue('margin-right'))

  if (temporary) {
    document.body.removeChild(element)
  }

  return [width, height]
}

function parse(prop) {
  return parseFloat(prop) || 0
}

},{}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],11:[function(require,module,exports){
module.exports = adjoint;

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};
},{}],12:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
function clone(a) {
    var out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],13:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],14:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
function create() {
    var out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],15:[function(require,module,exports){
module.exports = determinant;

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};
},{}],16:[function(require,module,exports){
module.exports = fromQuat;

/**
 * Creates a matrix from a quaternion rotation.
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @returns {mat4} out
 */
function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};
},{}],17:[function(require,module,exports){
module.exports = fromRotation

/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotate(dest, dest, rad, axis)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function fromRotation(out, rad, axis) {
  var s, c, t
  var x = axis[0]
  var y = axis[1]
  var z = axis[2]
  var len = Math.sqrt(x * x + y * y + z * z)

  if (Math.abs(len) < 0.000001) {
    return null
  }

  len = 1 / len
  x *= len
  y *= len
  z *= len

  s = Math.sin(rad)
  c = Math.cos(rad)
  t = 1 - c

  // Perform rotation-specific matrix multiplication
  out[0] = x * x * t + c
  out[1] = y * x * t + z * s
  out[2] = z * x * t - y * s
  out[3] = 0
  out[4] = x * y * t - z * s
  out[5] = y * y * t + c
  out[6] = z * y * t + x * s
  out[7] = 0
  out[8] = x * z * t + y * s
  out[9] = y * z * t - x * s
  out[10] = z * z * t + c
  out[11] = 0
  out[12] = 0
  out[13] = 0
  out[14] = 0
  out[15] = 1
  return out
}

},{}],18:[function(require,module,exports){
module.exports = fromRotationTranslation;

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
function fromRotationTranslation(out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};
},{}],19:[function(require,module,exports){
module.exports = fromScaling

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.scale(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Scaling vector
 * @returns {mat4} out
 */
function fromScaling(out, v) {
  out[0] = v[0]
  out[1] = 0
  out[2] = 0
  out[3] = 0
  out[4] = 0
  out[5] = v[1]
  out[6] = 0
  out[7] = 0
  out[8] = 0
  out[9] = 0
  out[10] = v[2]
  out[11] = 0
  out[12] = 0
  out[13] = 0
  out[14] = 0
  out[15] = 1
  return out
}

},{}],20:[function(require,module,exports){
module.exports = fromTranslation

/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.translate(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
function fromTranslation(out, v) {
  out[0] = 1
  out[1] = 0
  out[2] = 0
  out[3] = 0
  out[4] = 0
  out[5] = 1
  out[6] = 0
  out[7] = 0
  out[8] = 0
  out[9] = 0
  out[10] = 1
  out[11] = 0
  out[12] = v[0]
  out[13] = v[1]
  out[14] = v[2]
  out[15] = 1
  return out
}

},{}],21:[function(require,module,exports){
module.exports = fromXRotation

/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateX(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function fromXRotation(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad)

    // Perform axis-specific matrix multiplication
    out[0] = 1
    out[1] = 0
    out[2] = 0
    out[3] = 0
    out[4] = 0
    out[5] = c
    out[6] = s
    out[7] = 0
    out[8] = 0
    out[9] = -s
    out[10] = c
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
}
},{}],22:[function(require,module,exports){
module.exports = fromYRotation

/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateY(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function fromYRotation(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad)

    // Perform axis-specific matrix multiplication
    out[0] = c
    out[1] = 0
    out[2] = -s
    out[3] = 0
    out[4] = 0
    out[5] = 1
    out[6] = 0
    out[7] = 0
    out[8] = s
    out[9] = 0
    out[10] = c
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
}
},{}],23:[function(require,module,exports){
module.exports = fromZRotation

/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateZ(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function fromZRotation(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad)

    // Perform axis-specific matrix multiplication
    out[0] = c
    out[1] = s
    out[2] = 0
    out[3] = 0
    out[4] = -s
    out[5] = c
    out[6] = 0
    out[7] = 0
    out[8] = 0
    out[9] = 0
    out[10] = 1
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
}
},{}],24:[function(require,module,exports){
module.exports = frustum;

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
function frustum(out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};
},{}],25:[function(require,module,exports){
module.exports = identity;

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],26:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , copy: require('./copy')
  , identity: require('./identity')
  , transpose: require('./transpose')
  , invert: require('./invert')
  , adjoint: require('./adjoint')
  , determinant: require('./determinant')
  , multiply: require('./multiply')
  , translate: require('./translate')
  , scale: require('./scale')
  , rotate: require('./rotate')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , fromRotation: require('./fromRotation')
  , fromRotationTranslation: require('./fromRotationTranslation')
  , fromScaling: require('./fromScaling')
  , fromTranslation: require('./fromTranslation')
  , fromXRotation: require('./fromXRotation')
  , fromYRotation: require('./fromYRotation')
  , fromZRotation: require('./fromZRotation')
  , fromQuat: require('./fromQuat')
  , frustum: require('./frustum')
  , perspective: require('./perspective')
  , perspectiveFromFieldOfView: require('./perspectiveFromFieldOfView')
  , ortho: require('./ortho')
  , lookAt: require('./lookAt')
  , str: require('./str')
}

},{"./adjoint":11,"./clone":12,"./copy":13,"./create":14,"./determinant":15,"./fromQuat":16,"./fromRotation":17,"./fromRotationTranslation":18,"./fromScaling":19,"./fromTranslation":20,"./fromXRotation":21,"./fromYRotation":22,"./fromZRotation":23,"./frustum":24,"./identity":25,"./invert":27,"./lookAt":28,"./multiply":29,"./ortho":30,"./perspective":31,"./perspectiveFromFieldOfView":32,"./rotate":33,"./rotateX":34,"./rotateY":35,"./rotateZ":36,"./scale":37,"./str":38,"./translate":39,"./transpose":40}],27:[function(require,module,exports){
module.exports = invert;

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};
},{}],28:[function(require,module,exports){
var identity = require('./identity');

module.exports = lookAt;

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};
},{"./identity":25}],29:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};
},{}],30:[function(require,module,exports){
module.exports = ortho;

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function ortho(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};
},{}],31:[function(require,module,exports){
module.exports = perspective;

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspective(out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};
},{}],32:[function(require,module,exports){
module.exports = perspectiveFromFieldOfView;

/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
        xScale = 2.0 / (leftTan + rightTan),
        yScale = 2.0 / (upTan + downTan);

    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
}


},{}],33:[function(require,module,exports){
module.exports = rotate;

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < 0.000001) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};
},{}],34:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateX(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};
},{}],35:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateY(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};
},{}],36:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateZ(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};
},{}],37:[function(require,module,exports){
module.exports = scale;

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
function scale(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],38:[function(require,module,exports){
module.exports = str;

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
function str(a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};
},{}],39:[function(require,module,exports){
module.exports = translate;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
function translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};
},{}],40:[function(require,module,exports){
module.exports = transpose;

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function transpose(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};
},{}],41:[function(require,module,exports){

/*!
@fileoverview gl-matrix - High performance matrix and vector operations
@author Brandon Jones
@author Colin MacKenzie IV
@version 2.6.1

Copyright (c) 2015-2018, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/gl-matrix.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/gl-matrix.js":
/*!**************************!*\
  !*** ./src/gl-matrix.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.vec4 = exports.vec3 = exports.vec2 = exports.quat2 = exports.quat = exports.mat4 = exports.mat3 = exports.mat2d = exports.mat2 = exports.glMatrix = undefined;\n\nvar _common = __webpack_require__(/*! ./gl-matrix/common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nvar _mat = __webpack_require__(/*! ./gl-matrix/mat2.js */ \"./src/gl-matrix/mat2.js\");\n\nvar mat2 = _interopRequireWildcard(_mat);\n\nvar _mat2d = __webpack_require__(/*! ./gl-matrix/mat2d.js */ \"./src/gl-matrix/mat2d.js\");\n\nvar mat2d = _interopRequireWildcard(_mat2d);\n\nvar _mat2 = __webpack_require__(/*! ./gl-matrix/mat3.js */ \"./src/gl-matrix/mat3.js\");\n\nvar mat3 = _interopRequireWildcard(_mat2);\n\nvar _mat3 = __webpack_require__(/*! ./gl-matrix/mat4.js */ \"./src/gl-matrix/mat4.js\");\n\nvar mat4 = _interopRequireWildcard(_mat3);\n\nvar _quat = __webpack_require__(/*! ./gl-matrix/quat.js */ \"./src/gl-matrix/quat.js\");\n\nvar quat = _interopRequireWildcard(_quat);\n\nvar _quat2 = __webpack_require__(/*! ./gl-matrix/quat2.js */ \"./src/gl-matrix/quat2.js\");\n\nvar quat2 = _interopRequireWildcard(_quat2);\n\nvar _vec = __webpack_require__(/*! ./gl-matrix/vec2.js */ \"./src/gl-matrix/vec2.js\");\n\nvar vec2 = _interopRequireWildcard(_vec);\n\nvar _vec2 = __webpack_require__(/*! ./gl-matrix/vec3.js */ \"./src/gl-matrix/vec3.js\");\n\nvar vec3 = _interopRequireWildcard(_vec2);\n\nvar _vec3 = __webpack_require__(/*! ./gl-matrix/vec4.js */ \"./src/gl-matrix/vec4.js\");\n\nvar vec4 = _interopRequireWildcard(_vec3);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\nexports.glMatrix = glMatrix;\nexports.mat2 = mat2;\nexports.mat2d = mat2d;\nexports.mat3 = mat3;\nexports.mat4 = mat4;\nexports.quat = quat;\nexports.quat2 = quat2;\nexports.vec2 = vec2;\nexports.vec3 = vec3;\nexports.vec4 = vec4;\n\n//# sourceURL=webpack:///./src/gl-matrix.js?");

/***/ }),

/***/ "./src/gl-matrix/common.js":
/*!*********************************!*\
  !*** ./src/gl-matrix/common.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.setMatrixArrayType = setMatrixArrayType;\nexports.toRadian = toRadian;\nexports.equals = equals;\n/**\n * Common utilities\n * @module glMatrix\n */\n\n// Configuration Constants\nvar EPSILON = exports.EPSILON = 0.000001;\nvar ARRAY_TYPE = exports.ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;\nvar RANDOM = exports.RANDOM = Math.random;\n\n/**\n * Sets the type of array used when creating new vectors and matrices\n *\n * @param {Type} type Array type, such as Float32Array or Array\n */\nfunction setMatrixArrayType(type) {\n  exports.ARRAY_TYPE = ARRAY_TYPE = type;\n}\n\nvar degree = Math.PI / 180;\n\n/**\n * Convert Degree To Radian\n *\n * @param {Number} a Angle in Degrees\n */\nfunction toRadian(a) {\n  return a * degree;\n}\n\n/**\n * Tests whether or not the arguments have approximately the same value, within an absolute\n * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less\n * than or equal to 1.0, and a relative tolerance is used for larger values)\n *\n * @param {Number} a The first number to test.\n * @param {Number} b The second number to test.\n * @returns {Boolean} True if the numbers are approximately equal, false otherwise.\n */\nfunction equals(a, b) {\n  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));\n}\n\n//# sourceURL=webpack:///./src/gl-matrix/common.js?");

/***/ }),

/***/ "./src/gl-matrix/mat2.js":
/*!*******************************!*\
  !*** ./src/gl-matrix/mat2.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.sub = exports.mul = undefined;\nexports.create = create;\nexports.clone = clone;\nexports.copy = copy;\nexports.identity = identity;\nexports.fromValues = fromValues;\nexports.set = set;\nexports.transpose = transpose;\nexports.invert = invert;\nexports.adjoint = adjoint;\nexports.determinant = determinant;\nexports.multiply = multiply;\nexports.rotate = rotate;\nexports.scale = scale;\nexports.fromRotation = fromRotation;\nexports.fromScaling = fromScaling;\nexports.str = str;\nexports.frob = frob;\nexports.LDU = LDU;\nexports.add = add;\nexports.subtract = subtract;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\nexports.multiplyScalar = multiplyScalar;\nexports.multiplyScalarAndAdd = multiplyScalarAndAdd;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * 2x2 Matrix\n * @module mat2\n */\n\n/**\n * Creates a new identity mat2\n *\n * @returns {mat2} a new 2x2 matrix\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(4);\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  return out;\n}\n\n/**\n * Creates a new mat2 initialized with values from an existing matrix\n *\n * @param {mat2} a matrix to clone\n * @returns {mat2} a new 2x2 matrix\n */\nfunction clone(a) {\n  var out = new glMatrix.ARRAY_TYPE(4);\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  return out;\n}\n\n/**\n * Copy the values from one mat2 to another\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the source matrix\n * @returns {mat2} out\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  return out;\n}\n\n/**\n * Set a mat2 to the identity matrix\n *\n * @param {mat2} out the receiving matrix\n * @returns {mat2} out\n */\nfunction identity(out) {\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  return out;\n}\n\n/**\n * Create a new mat2 with the given values\n *\n * @param {Number} m00 Component in column 0, row 0 position (index 0)\n * @param {Number} m01 Component in column 0, row 1 position (index 1)\n * @param {Number} m10 Component in column 1, row 0 position (index 2)\n * @param {Number} m11 Component in column 1, row 1 position (index 3)\n * @returns {mat2} out A new 2x2 matrix\n */\nfunction fromValues(m00, m01, m10, m11) {\n  var out = new glMatrix.ARRAY_TYPE(4);\n  out[0] = m00;\n  out[1] = m01;\n  out[2] = m10;\n  out[3] = m11;\n  return out;\n}\n\n/**\n * Set the components of a mat2 to the given values\n *\n * @param {mat2} out the receiving matrix\n * @param {Number} m00 Component in column 0, row 0 position (index 0)\n * @param {Number} m01 Component in column 0, row 1 position (index 1)\n * @param {Number} m10 Component in column 1, row 0 position (index 2)\n * @param {Number} m11 Component in column 1, row 1 position (index 3)\n * @returns {mat2} out\n */\nfunction set(out, m00, m01, m10, m11) {\n  out[0] = m00;\n  out[1] = m01;\n  out[2] = m10;\n  out[3] = m11;\n  return out;\n}\n\n/**\n * Transpose the values of a mat2\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the source matrix\n * @returns {mat2} out\n */\nfunction transpose(out, a) {\n  // If we are transposing ourselves we can skip a few steps but have to cache\n  // some values\n  if (out === a) {\n    var a1 = a[1];\n    out[1] = a[2];\n    out[2] = a1;\n  } else {\n    out[0] = a[0];\n    out[1] = a[2];\n    out[2] = a[1];\n    out[3] = a[3];\n  }\n\n  return out;\n}\n\n/**\n * Inverts a mat2\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the source matrix\n * @returns {mat2} out\n */\nfunction invert(out, a) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n\n  // Calculate the determinant\n  var det = a0 * a3 - a2 * a1;\n\n  if (!det) {\n    return null;\n  }\n  det = 1.0 / det;\n\n  out[0] = a3 * det;\n  out[1] = -a1 * det;\n  out[2] = -a2 * det;\n  out[3] = a0 * det;\n\n  return out;\n}\n\n/**\n * Calculates the adjugate of a mat2\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the source matrix\n * @returns {mat2} out\n */\nfunction adjoint(out, a) {\n  // Caching this value is nessecary if out == a\n  var a0 = a[0];\n  out[0] = a[3];\n  out[1] = -a[1];\n  out[2] = -a[2];\n  out[3] = a0;\n\n  return out;\n}\n\n/**\n * Calculates the determinant of a mat2\n *\n * @param {mat2} a the source matrix\n * @returns {Number} determinant of a\n */\nfunction determinant(a) {\n  return a[0] * a[3] - a[2] * a[1];\n}\n\n/**\n * Multiplies two mat2's\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the first operand\n * @param {mat2} b the second operand\n * @returns {mat2} out\n */\nfunction multiply(out, a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3];\n  out[0] = a0 * b0 + a2 * b1;\n  out[1] = a1 * b0 + a3 * b1;\n  out[2] = a0 * b2 + a2 * b3;\n  out[3] = a1 * b2 + a3 * b3;\n  return out;\n}\n\n/**\n * Rotates a mat2 by the given angle\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the matrix to rotate\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat2} out\n */\nfunction rotate(out, a, rad) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n  out[0] = a0 * c + a2 * s;\n  out[1] = a1 * c + a3 * s;\n  out[2] = a0 * -s + a2 * c;\n  out[3] = a1 * -s + a3 * c;\n  return out;\n}\n\n/**\n * Scales the mat2 by the dimensions in the given vec2\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the matrix to rotate\n * @param {vec2} v the vec2 to scale the matrix by\n * @returns {mat2} out\n **/\nfunction scale(out, a, v) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n  var v0 = v[0],\n      v1 = v[1];\n  out[0] = a0 * v0;\n  out[1] = a1 * v0;\n  out[2] = a2 * v1;\n  out[3] = a3 * v1;\n  return out;\n}\n\n/**\n * Creates a matrix from a given angle\n * This is equivalent to (but much faster than):\n *\n *     mat2.identity(dest);\n *     mat2.rotate(dest, dest, rad);\n *\n * @param {mat2} out mat2 receiving operation result\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat2} out\n */\nfunction fromRotation(out, rad) {\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n  out[0] = c;\n  out[1] = s;\n  out[2] = -s;\n  out[3] = c;\n  return out;\n}\n\n/**\n * Creates a matrix from a vector scaling\n * This is equivalent to (but much faster than):\n *\n *     mat2.identity(dest);\n *     mat2.scale(dest, dest, vec);\n *\n * @param {mat2} out mat2 receiving operation result\n * @param {vec2} v Scaling vector\n * @returns {mat2} out\n */\nfunction fromScaling(out, v) {\n  out[0] = v[0];\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = v[1];\n  return out;\n}\n\n/**\n * Returns a string representation of a mat2\n *\n * @param {mat2} a matrix to represent as a string\n * @returns {String} string representation of the matrix\n */\nfunction str(a) {\n  return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';\n}\n\n/**\n * Returns Frobenius norm of a mat2\n *\n * @param {mat2} a the matrix to calculate Frobenius norm of\n * @returns {Number} Frobenius norm\n */\nfunction frob(a) {\n  return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2));\n}\n\n/**\n * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix\n * @param {mat2} L the lower triangular matrix\n * @param {mat2} D the diagonal matrix\n * @param {mat2} U the upper triangular matrix\n * @param {mat2} a the input matrix to factorize\n */\n\nfunction LDU(L, D, U, a) {\n  L[2] = a[2] / a[0];\n  U[0] = a[0];\n  U[1] = a[1];\n  U[3] = a[3] - L[2] * U[1];\n  return [L, D, U];\n}\n\n/**\n * Adds two mat2's\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the first operand\n * @param {mat2} b the second operand\n * @returns {mat2} out\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  out[2] = a[2] + b[2];\n  out[3] = a[3] + b[3];\n  return out;\n}\n\n/**\n * Subtracts matrix b from matrix a\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the first operand\n * @param {mat2} b the second operand\n * @returns {mat2} out\n */\nfunction subtract(out, a, b) {\n  out[0] = a[0] - b[0];\n  out[1] = a[1] - b[1];\n  out[2] = a[2] - b[2];\n  out[3] = a[3] - b[3];\n  return out;\n}\n\n/**\n * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)\n *\n * @param {mat2} a The first matrix.\n * @param {mat2} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];\n}\n\n/**\n * Returns whether or not the matrices have approximately the same elements in the same position.\n *\n * @param {mat2} a The first matrix.\n * @param {mat2} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3];\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3));\n}\n\n/**\n * Multiply each element of the matrix by a scalar.\n *\n * @param {mat2} out the receiving matrix\n * @param {mat2} a the matrix to scale\n * @param {Number} b amount to scale the matrix's elements by\n * @returns {mat2} out\n */\nfunction multiplyScalar(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  out[2] = a[2] * b;\n  out[3] = a[3] * b;\n  return out;\n}\n\n/**\n * Adds two mat2's after multiplying each element of the second operand by a scalar value.\n *\n * @param {mat2} out the receiving vector\n * @param {mat2} a the first operand\n * @param {mat2} b the second operand\n * @param {Number} scale the amount to scale b's elements by before adding\n * @returns {mat2} out\n */\nfunction multiplyScalarAndAdd(out, a, b, scale) {\n  out[0] = a[0] + b[0] * scale;\n  out[1] = a[1] + b[1] * scale;\n  out[2] = a[2] + b[2] * scale;\n  out[3] = a[3] + b[3] * scale;\n  return out;\n}\n\n/**\n * Alias for {@link mat2.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Alias for {@link mat2.subtract}\n * @function\n */\nvar sub = exports.sub = subtract;\n\n//# sourceURL=webpack:///./src/gl-matrix/mat2.js?");

/***/ }),

/***/ "./src/gl-matrix/mat2d.js":
/*!********************************!*\
  !*** ./src/gl-matrix/mat2d.js ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.sub = exports.mul = undefined;\nexports.create = create;\nexports.clone = clone;\nexports.copy = copy;\nexports.identity = identity;\nexports.fromValues = fromValues;\nexports.set = set;\nexports.invert = invert;\nexports.determinant = determinant;\nexports.multiply = multiply;\nexports.rotate = rotate;\nexports.scale = scale;\nexports.translate = translate;\nexports.fromRotation = fromRotation;\nexports.fromScaling = fromScaling;\nexports.fromTranslation = fromTranslation;\nexports.str = str;\nexports.frob = frob;\nexports.add = add;\nexports.subtract = subtract;\nexports.multiplyScalar = multiplyScalar;\nexports.multiplyScalarAndAdd = multiplyScalarAndAdd;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * 2x3 Matrix\n * @module mat2d\n *\n * @description\n * A mat2d contains six elements defined as:\n * <pre>\n * [a, c, tx,\n *  b, d, ty]\n * </pre>\n * This is a short form for the 3x3 matrix:\n * <pre>\n * [a, c, tx,\n *  b, d, ty,\n *  0, 0, 1]\n * </pre>\n * The last row is ignored so the array is shorter and operations are faster.\n */\n\n/**\n * Creates a new identity mat2d\n *\n * @returns {mat2d} a new 2x3 matrix\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(6);\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  out[4] = 0;\n  out[5] = 0;\n  return out;\n}\n\n/**\n * Creates a new mat2d initialized with values from an existing matrix\n *\n * @param {mat2d} a matrix to clone\n * @returns {mat2d} a new 2x3 matrix\n */\nfunction clone(a) {\n  var out = new glMatrix.ARRAY_TYPE(6);\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  out[4] = a[4];\n  out[5] = a[5];\n  return out;\n}\n\n/**\n * Copy the values from one mat2d to another\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the source matrix\n * @returns {mat2d} out\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  out[4] = a[4];\n  out[5] = a[5];\n  return out;\n}\n\n/**\n * Set a mat2d to the identity matrix\n *\n * @param {mat2d} out the receiving matrix\n * @returns {mat2d} out\n */\nfunction identity(out) {\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  out[4] = 0;\n  out[5] = 0;\n  return out;\n}\n\n/**\n * Create a new mat2d with the given values\n *\n * @param {Number} a Component A (index 0)\n * @param {Number} b Component B (index 1)\n * @param {Number} c Component C (index 2)\n * @param {Number} d Component D (index 3)\n * @param {Number} tx Component TX (index 4)\n * @param {Number} ty Component TY (index 5)\n * @returns {mat2d} A new mat2d\n */\nfunction fromValues(a, b, c, d, tx, ty) {\n  var out = new glMatrix.ARRAY_TYPE(6);\n  out[0] = a;\n  out[1] = b;\n  out[2] = c;\n  out[3] = d;\n  out[4] = tx;\n  out[5] = ty;\n  return out;\n}\n\n/**\n * Set the components of a mat2d to the given values\n *\n * @param {mat2d} out the receiving matrix\n * @param {Number} a Component A (index 0)\n * @param {Number} b Component B (index 1)\n * @param {Number} c Component C (index 2)\n * @param {Number} d Component D (index 3)\n * @param {Number} tx Component TX (index 4)\n * @param {Number} ty Component TY (index 5)\n * @returns {mat2d} out\n */\nfunction set(out, a, b, c, d, tx, ty) {\n  out[0] = a;\n  out[1] = b;\n  out[2] = c;\n  out[3] = d;\n  out[4] = tx;\n  out[5] = ty;\n  return out;\n}\n\n/**\n * Inverts a mat2d\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the source matrix\n * @returns {mat2d} out\n */\nfunction invert(out, a) {\n  var aa = a[0],\n      ab = a[1],\n      ac = a[2],\n      ad = a[3];\n  var atx = a[4],\n      aty = a[5];\n\n  var det = aa * ad - ab * ac;\n  if (!det) {\n    return null;\n  }\n  det = 1.0 / det;\n\n  out[0] = ad * det;\n  out[1] = -ab * det;\n  out[2] = -ac * det;\n  out[3] = aa * det;\n  out[4] = (ac * aty - ad * atx) * det;\n  out[5] = (ab * atx - aa * aty) * det;\n  return out;\n}\n\n/**\n * Calculates the determinant of a mat2d\n *\n * @param {mat2d} a the source matrix\n * @returns {Number} determinant of a\n */\nfunction determinant(a) {\n  return a[0] * a[3] - a[1] * a[2];\n}\n\n/**\n * Multiplies two mat2d's\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the first operand\n * @param {mat2d} b the second operand\n * @returns {mat2d} out\n */\nfunction multiply(out, a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3],\n      a4 = a[4],\n      a5 = a[5];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3],\n      b4 = b[4],\n      b5 = b[5];\n  out[0] = a0 * b0 + a2 * b1;\n  out[1] = a1 * b0 + a3 * b1;\n  out[2] = a0 * b2 + a2 * b3;\n  out[3] = a1 * b2 + a3 * b3;\n  out[4] = a0 * b4 + a2 * b5 + a4;\n  out[5] = a1 * b4 + a3 * b5 + a5;\n  return out;\n}\n\n/**\n * Rotates a mat2d by the given angle\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the matrix to rotate\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat2d} out\n */\nfunction rotate(out, a, rad) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3],\n      a4 = a[4],\n      a5 = a[5];\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n  out[0] = a0 * c + a2 * s;\n  out[1] = a1 * c + a3 * s;\n  out[2] = a0 * -s + a2 * c;\n  out[3] = a1 * -s + a3 * c;\n  out[4] = a4;\n  out[5] = a5;\n  return out;\n}\n\n/**\n * Scales the mat2d by the dimensions in the given vec2\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the matrix to translate\n * @param {vec2} v the vec2 to scale the matrix by\n * @returns {mat2d} out\n **/\nfunction scale(out, a, v) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3],\n      a4 = a[4],\n      a5 = a[5];\n  var v0 = v[0],\n      v1 = v[1];\n  out[0] = a0 * v0;\n  out[1] = a1 * v0;\n  out[2] = a2 * v1;\n  out[3] = a3 * v1;\n  out[4] = a4;\n  out[5] = a5;\n  return out;\n}\n\n/**\n * Translates the mat2d by the dimensions in the given vec2\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the matrix to translate\n * @param {vec2} v the vec2 to translate the matrix by\n * @returns {mat2d} out\n **/\nfunction translate(out, a, v) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3],\n      a4 = a[4],\n      a5 = a[5];\n  var v0 = v[0],\n      v1 = v[1];\n  out[0] = a0;\n  out[1] = a1;\n  out[2] = a2;\n  out[3] = a3;\n  out[4] = a0 * v0 + a2 * v1 + a4;\n  out[5] = a1 * v0 + a3 * v1 + a5;\n  return out;\n}\n\n/**\n * Creates a matrix from a given angle\n * This is equivalent to (but much faster than):\n *\n *     mat2d.identity(dest);\n *     mat2d.rotate(dest, dest, rad);\n *\n * @param {mat2d} out mat2d receiving operation result\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat2d} out\n */\nfunction fromRotation(out, rad) {\n  var s = Math.sin(rad),\n      c = Math.cos(rad);\n  out[0] = c;\n  out[1] = s;\n  out[2] = -s;\n  out[3] = c;\n  out[4] = 0;\n  out[5] = 0;\n  return out;\n}\n\n/**\n * Creates a matrix from a vector scaling\n * This is equivalent to (but much faster than):\n *\n *     mat2d.identity(dest);\n *     mat2d.scale(dest, dest, vec);\n *\n * @param {mat2d} out mat2d receiving operation result\n * @param {vec2} v Scaling vector\n * @returns {mat2d} out\n */\nfunction fromScaling(out, v) {\n  out[0] = v[0];\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = v[1];\n  out[4] = 0;\n  out[5] = 0;\n  return out;\n}\n\n/**\n * Creates a matrix from a vector translation\n * This is equivalent to (but much faster than):\n *\n *     mat2d.identity(dest);\n *     mat2d.translate(dest, dest, vec);\n *\n * @param {mat2d} out mat2d receiving operation result\n * @param {vec2} v Translation vector\n * @returns {mat2d} out\n */\nfunction fromTranslation(out, v) {\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  out[4] = v[0];\n  out[5] = v[1];\n  return out;\n}\n\n/**\n * Returns a string representation of a mat2d\n *\n * @param {mat2d} a matrix to represent as a string\n * @returns {String} string representation of the matrix\n */\nfunction str(a) {\n  return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' + a[4] + ', ' + a[5] + ')';\n}\n\n/**\n * Returns Frobenius norm of a mat2d\n *\n * @param {mat2d} a the matrix to calculate Frobenius norm of\n * @returns {Number} Frobenius norm\n */\nfunction frob(a) {\n  return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1);\n}\n\n/**\n * Adds two mat2d's\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the first operand\n * @param {mat2d} b the second operand\n * @returns {mat2d} out\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  out[2] = a[2] + b[2];\n  out[3] = a[3] + b[3];\n  out[4] = a[4] + b[4];\n  out[5] = a[5] + b[5];\n  return out;\n}\n\n/**\n * Subtracts matrix b from matrix a\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the first operand\n * @param {mat2d} b the second operand\n * @returns {mat2d} out\n */\nfunction subtract(out, a, b) {\n  out[0] = a[0] - b[0];\n  out[1] = a[1] - b[1];\n  out[2] = a[2] - b[2];\n  out[3] = a[3] - b[3];\n  out[4] = a[4] - b[4];\n  out[5] = a[5] - b[5];\n  return out;\n}\n\n/**\n * Multiply each element of the matrix by a scalar.\n *\n * @param {mat2d} out the receiving matrix\n * @param {mat2d} a the matrix to scale\n * @param {Number} b amount to scale the matrix's elements by\n * @returns {mat2d} out\n */\nfunction multiplyScalar(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  out[2] = a[2] * b;\n  out[3] = a[3] * b;\n  out[4] = a[4] * b;\n  out[5] = a[5] * b;\n  return out;\n}\n\n/**\n * Adds two mat2d's after multiplying each element of the second operand by a scalar value.\n *\n * @param {mat2d} out the receiving vector\n * @param {mat2d} a the first operand\n * @param {mat2d} b the second operand\n * @param {Number} scale the amount to scale b's elements by before adding\n * @returns {mat2d} out\n */\nfunction multiplyScalarAndAdd(out, a, b, scale) {\n  out[0] = a[0] + b[0] * scale;\n  out[1] = a[1] + b[1] * scale;\n  out[2] = a[2] + b[2] * scale;\n  out[3] = a[3] + b[3] * scale;\n  out[4] = a[4] + b[4] * scale;\n  out[5] = a[5] + b[5] * scale;\n  return out;\n}\n\n/**\n * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)\n *\n * @param {mat2d} a The first matrix.\n * @param {mat2d} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];\n}\n\n/**\n * Returns whether or not the matrices have approximately the same elements in the same position.\n *\n * @param {mat2d} a The first matrix.\n * @param {mat2d} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3],\n      a4 = a[4],\n      a5 = a[5];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3],\n      b4 = b[4],\n      b5 = b[5];\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5));\n}\n\n/**\n * Alias for {@link mat2d.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Alias for {@link mat2d.subtract}\n * @function\n */\nvar sub = exports.sub = subtract;\n\n//# sourceURL=webpack:///./src/gl-matrix/mat2d.js?");

/***/ }),

/***/ "./src/gl-matrix/mat3.js":
/*!*******************************!*\
  !*** ./src/gl-matrix/mat3.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.sub = exports.mul = undefined;\nexports.create = create;\nexports.fromMat4 = fromMat4;\nexports.clone = clone;\nexports.copy = copy;\nexports.fromValues = fromValues;\nexports.set = set;\nexports.identity = identity;\nexports.transpose = transpose;\nexports.invert = invert;\nexports.adjoint = adjoint;\nexports.determinant = determinant;\nexports.multiply = multiply;\nexports.translate = translate;\nexports.rotate = rotate;\nexports.scale = scale;\nexports.fromTranslation = fromTranslation;\nexports.fromRotation = fromRotation;\nexports.fromScaling = fromScaling;\nexports.fromMat2d = fromMat2d;\nexports.fromQuat = fromQuat;\nexports.normalFromMat4 = normalFromMat4;\nexports.projection = projection;\nexports.str = str;\nexports.frob = frob;\nexports.add = add;\nexports.subtract = subtract;\nexports.multiplyScalar = multiplyScalar;\nexports.multiplyScalarAndAdd = multiplyScalarAndAdd;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * 3x3 Matrix\n * @module mat3\n */\n\n/**\n * Creates a new identity mat3\n *\n * @returns {mat3} a new 3x3 matrix\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(9);\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 1;\n  out[5] = 0;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 1;\n  return out;\n}\n\n/**\n * Copies the upper-left 3x3 values into the given mat3.\n *\n * @param {mat3} out the receiving 3x3 matrix\n * @param {mat4} a   the source 4x4 matrix\n * @returns {mat3} out\n */\nfunction fromMat4(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[4];\n  out[4] = a[5];\n  out[5] = a[6];\n  out[6] = a[8];\n  out[7] = a[9];\n  out[8] = a[10];\n  return out;\n}\n\n/**\n * Creates a new mat3 initialized with values from an existing matrix\n *\n * @param {mat3} a matrix to clone\n * @returns {mat3} a new 3x3 matrix\n */\nfunction clone(a) {\n  var out = new glMatrix.ARRAY_TYPE(9);\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  out[4] = a[4];\n  out[5] = a[5];\n  out[6] = a[6];\n  out[7] = a[7];\n  out[8] = a[8];\n  return out;\n}\n\n/**\n * Copy the values from one mat3 to another\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the source matrix\n * @returns {mat3} out\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  out[4] = a[4];\n  out[5] = a[5];\n  out[6] = a[6];\n  out[7] = a[7];\n  out[8] = a[8];\n  return out;\n}\n\n/**\n * Create a new mat3 with the given values\n *\n * @param {Number} m00 Component in column 0, row 0 position (index 0)\n * @param {Number} m01 Component in column 0, row 1 position (index 1)\n * @param {Number} m02 Component in column 0, row 2 position (index 2)\n * @param {Number} m10 Component in column 1, row 0 position (index 3)\n * @param {Number} m11 Component in column 1, row 1 position (index 4)\n * @param {Number} m12 Component in column 1, row 2 position (index 5)\n * @param {Number} m20 Component in column 2, row 0 position (index 6)\n * @param {Number} m21 Component in column 2, row 1 position (index 7)\n * @param {Number} m22 Component in column 2, row 2 position (index 8)\n * @returns {mat3} A new mat3\n */\nfunction fromValues(m00, m01, m02, m10, m11, m12, m20, m21, m22) {\n  var out = new glMatrix.ARRAY_TYPE(9);\n  out[0] = m00;\n  out[1] = m01;\n  out[2] = m02;\n  out[3] = m10;\n  out[4] = m11;\n  out[5] = m12;\n  out[6] = m20;\n  out[7] = m21;\n  out[8] = m22;\n  return out;\n}\n\n/**\n * Set the components of a mat3 to the given values\n *\n * @param {mat3} out the receiving matrix\n * @param {Number} m00 Component in column 0, row 0 position (index 0)\n * @param {Number} m01 Component in column 0, row 1 position (index 1)\n * @param {Number} m02 Component in column 0, row 2 position (index 2)\n * @param {Number} m10 Component in column 1, row 0 position (index 3)\n * @param {Number} m11 Component in column 1, row 1 position (index 4)\n * @param {Number} m12 Component in column 1, row 2 position (index 5)\n * @param {Number} m20 Component in column 2, row 0 position (index 6)\n * @param {Number} m21 Component in column 2, row 1 position (index 7)\n * @param {Number} m22 Component in column 2, row 2 position (index 8)\n * @returns {mat3} out\n */\nfunction set(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {\n  out[0] = m00;\n  out[1] = m01;\n  out[2] = m02;\n  out[3] = m10;\n  out[4] = m11;\n  out[5] = m12;\n  out[6] = m20;\n  out[7] = m21;\n  out[8] = m22;\n  return out;\n}\n\n/**\n * Set a mat3 to the identity matrix\n *\n * @param {mat3} out the receiving matrix\n * @returns {mat3} out\n */\nfunction identity(out) {\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 1;\n  out[5] = 0;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 1;\n  return out;\n}\n\n/**\n * Transpose the values of a mat3\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the source matrix\n * @returns {mat3} out\n */\nfunction transpose(out, a) {\n  // If we are transposing ourselves we can skip a few steps but have to cache some values\n  if (out === a) {\n    var a01 = a[1],\n        a02 = a[2],\n        a12 = a[5];\n    out[1] = a[3];\n    out[2] = a[6];\n    out[3] = a01;\n    out[5] = a[7];\n    out[6] = a02;\n    out[7] = a12;\n  } else {\n    out[0] = a[0];\n    out[1] = a[3];\n    out[2] = a[6];\n    out[3] = a[1];\n    out[4] = a[4];\n    out[5] = a[7];\n    out[6] = a[2];\n    out[7] = a[5];\n    out[8] = a[8];\n  }\n\n  return out;\n}\n\n/**\n * Inverts a mat3\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the source matrix\n * @returns {mat3} out\n */\nfunction invert(out, a) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2];\n  var a10 = a[3],\n      a11 = a[4],\n      a12 = a[5];\n  var a20 = a[6],\n      a21 = a[7],\n      a22 = a[8];\n\n  var b01 = a22 * a11 - a12 * a21;\n  var b11 = -a22 * a10 + a12 * a20;\n  var b21 = a21 * a10 - a11 * a20;\n\n  // Calculate the determinant\n  var det = a00 * b01 + a01 * b11 + a02 * b21;\n\n  if (!det) {\n    return null;\n  }\n  det = 1.0 / det;\n\n  out[0] = b01 * det;\n  out[1] = (-a22 * a01 + a02 * a21) * det;\n  out[2] = (a12 * a01 - a02 * a11) * det;\n  out[3] = b11 * det;\n  out[4] = (a22 * a00 - a02 * a20) * det;\n  out[5] = (-a12 * a00 + a02 * a10) * det;\n  out[6] = b21 * det;\n  out[7] = (-a21 * a00 + a01 * a20) * det;\n  out[8] = (a11 * a00 - a01 * a10) * det;\n  return out;\n}\n\n/**\n * Calculates the adjugate of a mat3\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the source matrix\n * @returns {mat3} out\n */\nfunction adjoint(out, a) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2];\n  var a10 = a[3],\n      a11 = a[4],\n      a12 = a[5];\n  var a20 = a[6],\n      a21 = a[7],\n      a22 = a[8];\n\n  out[0] = a11 * a22 - a12 * a21;\n  out[1] = a02 * a21 - a01 * a22;\n  out[2] = a01 * a12 - a02 * a11;\n  out[3] = a12 * a20 - a10 * a22;\n  out[4] = a00 * a22 - a02 * a20;\n  out[5] = a02 * a10 - a00 * a12;\n  out[6] = a10 * a21 - a11 * a20;\n  out[7] = a01 * a20 - a00 * a21;\n  out[8] = a00 * a11 - a01 * a10;\n  return out;\n}\n\n/**\n * Calculates the determinant of a mat3\n *\n * @param {mat3} a the source matrix\n * @returns {Number} determinant of a\n */\nfunction determinant(a) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2];\n  var a10 = a[3],\n      a11 = a[4],\n      a12 = a[5];\n  var a20 = a[6],\n      a21 = a[7],\n      a22 = a[8];\n\n  return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);\n}\n\n/**\n * Multiplies two mat3's\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the first operand\n * @param {mat3} b the second operand\n * @returns {mat3} out\n */\nfunction multiply(out, a, b) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2];\n  var a10 = a[3],\n      a11 = a[4],\n      a12 = a[5];\n  var a20 = a[6],\n      a21 = a[7],\n      a22 = a[8];\n\n  var b00 = b[0],\n      b01 = b[1],\n      b02 = b[2];\n  var b10 = b[3],\n      b11 = b[4],\n      b12 = b[5];\n  var b20 = b[6],\n      b21 = b[7],\n      b22 = b[8];\n\n  out[0] = b00 * a00 + b01 * a10 + b02 * a20;\n  out[1] = b00 * a01 + b01 * a11 + b02 * a21;\n  out[2] = b00 * a02 + b01 * a12 + b02 * a22;\n\n  out[3] = b10 * a00 + b11 * a10 + b12 * a20;\n  out[4] = b10 * a01 + b11 * a11 + b12 * a21;\n  out[5] = b10 * a02 + b11 * a12 + b12 * a22;\n\n  out[6] = b20 * a00 + b21 * a10 + b22 * a20;\n  out[7] = b20 * a01 + b21 * a11 + b22 * a21;\n  out[8] = b20 * a02 + b21 * a12 + b22 * a22;\n  return out;\n}\n\n/**\n * Translate a mat3 by the given vector\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the matrix to translate\n * @param {vec2} v vector to translate by\n * @returns {mat3} out\n */\nfunction translate(out, a, v) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2],\n      a10 = a[3],\n      a11 = a[4],\n      a12 = a[5],\n      a20 = a[6],\n      a21 = a[7],\n      a22 = a[8],\n      x = v[0],\n      y = v[1];\n\n  out[0] = a00;\n  out[1] = a01;\n  out[2] = a02;\n\n  out[3] = a10;\n  out[4] = a11;\n  out[5] = a12;\n\n  out[6] = x * a00 + y * a10 + a20;\n  out[7] = x * a01 + y * a11 + a21;\n  out[8] = x * a02 + y * a12 + a22;\n  return out;\n}\n\n/**\n * Rotates a mat3 by the given angle\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the matrix to rotate\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat3} out\n */\nfunction rotate(out, a, rad) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2],\n      a10 = a[3],\n      a11 = a[4],\n      a12 = a[5],\n      a20 = a[6],\n      a21 = a[7],\n      a22 = a[8],\n      s = Math.sin(rad),\n      c = Math.cos(rad);\n\n  out[0] = c * a00 + s * a10;\n  out[1] = c * a01 + s * a11;\n  out[2] = c * a02 + s * a12;\n\n  out[3] = c * a10 - s * a00;\n  out[4] = c * a11 - s * a01;\n  out[5] = c * a12 - s * a02;\n\n  out[6] = a20;\n  out[7] = a21;\n  out[8] = a22;\n  return out;\n};\n\n/**\n * Scales the mat3 by the dimensions in the given vec2\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the matrix to rotate\n * @param {vec2} v the vec2 to scale the matrix by\n * @returns {mat3} out\n **/\nfunction scale(out, a, v) {\n  var x = v[0],\n      y = v[1];\n\n  out[0] = x * a[0];\n  out[1] = x * a[1];\n  out[2] = x * a[2];\n\n  out[3] = y * a[3];\n  out[4] = y * a[4];\n  out[5] = y * a[5];\n\n  out[6] = a[6];\n  out[7] = a[7];\n  out[8] = a[8];\n  return out;\n}\n\n/**\n * Creates a matrix from a vector translation\n * This is equivalent to (but much faster than):\n *\n *     mat3.identity(dest);\n *     mat3.translate(dest, dest, vec);\n *\n * @param {mat3} out mat3 receiving operation result\n * @param {vec2} v Translation vector\n * @returns {mat3} out\n */\nfunction fromTranslation(out, v) {\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 1;\n  out[5] = 0;\n  out[6] = v[0];\n  out[7] = v[1];\n  out[8] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from a given angle\n * This is equivalent to (but much faster than):\n *\n *     mat3.identity(dest);\n *     mat3.rotate(dest, dest, rad);\n *\n * @param {mat3} out mat3 receiving operation result\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat3} out\n */\nfunction fromRotation(out, rad) {\n  var s = Math.sin(rad),\n      c = Math.cos(rad);\n\n  out[0] = c;\n  out[1] = s;\n  out[2] = 0;\n\n  out[3] = -s;\n  out[4] = c;\n  out[5] = 0;\n\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from a vector scaling\n * This is equivalent to (but much faster than):\n *\n *     mat3.identity(dest);\n *     mat3.scale(dest, dest, vec);\n *\n * @param {mat3} out mat3 receiving operation result\n * @param {vec2} v Scaling vector\n * @returns {mat3} out\n */\nfunction fromScaling(out, v) {\n  out[0] = v[0];\n  out[1] = 0;\n  out[2] = 0;\n\n  out[3] = 0;\n  out[4] = v[1];\n  out[5] = 0;\n\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 1;\n  return out;\n}\n\n/**\n * Copies the values from a mat2d into a mat3\n *\n * @param {mat3} out the receiving matrix\n * @param {mat2d} a the matrix to copy\n * @returns {mat3} out\n **/\nfunction fromMat2d(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = 0;\n\n  out[3] = a[2];\n  out[4] = a[3];\n  out[5] = 0;\n\n  out[6] = a[4];\n  out[7] = a[5];\n  out[8] = 1;\n  return out;\n}\n\n/**\n* Calculates a 3x3 matrix from the given quaternion\n*\n* @param {mat3} out mat3 receiving operation result\n* @param {quat} q Quaternion to create matrix from\n*\n* @returns {mat3} out\n*/\nfunction fromQuat(out, q) {\n  var x = q[0],\n      y = q[1],\n      z = q[2],\n      w = q[3];\n  var x2 = x + x;\n  var y2 = y + y;\n  var z2 = z + z;\n\n  var xx = x * x2;\n  var yx = y * x2;\n  var yy = y * y2;\n  var zx = z * x2;\n  var zy = z * y2;\n  var zz = z * z2;\n  var wx = w * x2;\n  var wy = w * y2;\n  var wz = w * z2;\n\n  out[0] = 1 - yy - zz;\n  out[3] = yx - wz;\n  out[6] = zx + wy;\n\n  out[1] = yx + wz;\n  out[4] = 1 - xx - zz;\n  out[7] = zy - wx;\n\n  out[2] = zx - wy;\n  out[5] = zy + wx;\n  out[8] = 1 - xx - yy;\n\n  return out;\n}\n\n/**\n* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix\n*\n* @param {mat3} out mat3 receiving operation result\n* @param {mat4} a Mat4 to derive the normal matrix from\n*\n* @returns {mat3} out\n*/\nfunction normalFromMat4(out, a) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2],\n      a03 = a[3];\n  var a10 = a[4],\n      a11 = a[5],\n      a12 = a[6],\n      a13 = a[7];\n  var a20 = a[8],\n      a21 = a[9],\n      a22 = a[10],\n      a23 = a[11];\n  var a30 = a[12],\n      a31 = a[13],\n      a32 = a[14],\n      a33 = a[15];\n\n  var b00 = a00 * a11 - a01 * a10;\n  var b01 = a00 * a12 - a02 * a10;\n  var b02 = a00 * a13 - a03 * a10;\n  var b03 = a01 * a12 - a02 * a11;\n  var b04 = a01 * a13 - a03 * a11;\n  var b05 = a02 * a13 - a03 * a12;\n  var b06 = a20 * a31 - a21 * a30;\n  var b07 = a20 * a32 - a22 * a30;\n  var b08 = a20 * a33 - a23 * a30;\n  var b09 = a21 * a32 - a22 * a31;\n  var b10 = a21 * a33 - a23 * a31;\n  var b11 = a22 * a33 - a23 * a32;\n\n  // Calculate the determinant\n  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n\n  if (!det) {\n    return null;\n  }\n  det = 1.0 / det;\n\n  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n  out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n  out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n\n  out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n  out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n  out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n\n  out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n  out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n  out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n\n  return out;\n}\n\n/**\n * Generates a 2D projection matrix with the given bounds\n *\n * @param {mat3} out mat3 frustum matrix will be written into\n * @param {number} width Width of your gl context\n * @param {number} height Height of gl context\n * @returns {mat3} out\n */\nfunction projection(out, width, height) {\n  out[0] = 2 / width;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = -2 / height;\n  out[5] = 0;\n  out[6] = -1;\n  out[7] = 1;\n  out[8] = 1;\n  return out;\n}\n\n/**\n * Returns a string representation of a mat3\n *\n * @param {mat3} a matrix to represent as a string\n * @returns {String} string representation of the matrix\n */\nfunction str(a) {\n  return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' + a[8] + ')';\n}\n\n/**\n * Returns Frobenius norm of a mat3\n *\n * @param {mat3} a the matrix to calculate Frobenius norm of\n * @returns {Number} Frobenius norm\n */\nfunction frob(a) {\n  return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2));\n}\n\n/**\n * Adds two mat3's\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the first operand\n * @param {mat3} b the second operand\n * @returns {mat3} out\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  out[2] = a[2] + b[2];\n  out[3] = a[3] + b[3];\n  out[4] = a[4] + b[4];\n  out[5] = a[5] + b[5];\n  out[6] = a[6] + b[6];\n  out[7] = a[7] + b[7];\n  out[8] = a[8] + b[8];\n  return out;\n}\n\n/**\n * Subtracts matrix b from matrix a\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the first operand\n * @param {mat3} b the second operand\n * @returns {mat3} out\n */\nfunction subtract(out, a, b) {\n  out[0] = a[0] - b[0];\n  out[1] = a[1] - b[1];\n  out[2] = a[2] - b[2];\n  out[3] = a[3] - b[3];\n  out[4] = a[4] - b[4];\n  out[5] = a[5] - b[5];\n  out[6] = a[6] - b[6];\n  out[7] = a[7] - b[7];\n  out[8] = a[8] - b[8];\n  return out;\n}\n\n/**\n * Multiply each element of the matrix by a scalar.\n *\n * @param {mat3} out the receiving matrix\n * @param {mat3} a the matrix to scale\n * @param {Number} b amount to scale the matrix's elements by\n * @returns {mat3} out\n */\nfunction multiplyScalar(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  out[2] = a[2] * b;\n  out[3] = a[3] * b;\n  out[4] = a[4] * b;\n  out[5] = a[5] * b;\n  out[6] = a[6] * b;\n  out[7] = a[7] * b;\n  out[8] = a[8] * b;\n  return out;\n}\n\n/**\n * Adds two mat3's after multiplying each element of the second operand by a scalar value.\n *\n * @param {mat3} out the receiving vector\n * @param {mat3} a the first operand\n * @param {mat3} b the second operand\n * @param {Number} scale the amount to scale b's elements by before adding\n * @returns {mat3} out\n */\nfunction multiplyScalarAndAdd(out, a, b, scale) {\n  out[0] = a[0] + b[0] * scale;\n  out[1] = a[1] + b[1] * scale;\n  out[2] = a[2] + b[2] * scale;\n  out[3] = a[3] + b[3] * scale;\n  out[4] = a[4] + b[4] * scale;\n  out[5] = a[5] + b[5] * scale;\n  out[6] = a[6] + b[6] * scale;\n  out[7] = a[7] + b[7] * scale;\n  out[8] = a[8] + b[8] * scale;\n  return out;\n}\n\n/**\n * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)\n *\n * @param {mat3} a The first matrix.\n * @param {mat3} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];\n}\n\n/**\n * Returns whether or not the matrices have approximately the same elements in the same position.\n *\n * @param {mat3} a The first matrix.\n * @param {mat3} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3],\n      a4 = a[4],\n      a5 = a[5],\n      a6 = a[6],\n      a7 = a[7],\n      a8 = a[8];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3],\n      b4 = b[4],\n      b5 = b[5],\n      b6 = b[6],\n      b7 = b[7],\n      b8 = b[8];\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8));\n}\n\n/**\n * Alias for {@link mat3.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Alias for {@link mat3.subtract}\n * @function\n */\nvar sub = exports.sub = subtract;\n\n//# sourceURL=webpack:///./src/gl-matrix/mat3.js?");

/***/ }),

/***/ "./src/gl-matrix/mat4.js":
/*!*******************************!*\
  !*** ./src/gl-matrix/mat4.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.sub = exports.mul = undefined;\nexports.create = create;\nexports.clone = clone;\nexports.copy = copy;\nexports.fromValues = fromValues;\nexports.set = set;\nexports.identity = identity;\nexports.transpose = transpose;\nexports.invert = invert;\nexports.adjoint = adjoint;\nexports.determinant = determinant;\nexports.multiply = multiply;\nexports.translate = translate;\nexports.scale = scale;\nexports.rotate = rotate;\nexports.rotateX = rotateX;\nexports.rotateY = rotateY;\nexports.rotateZ = rotateZ;\nexports.fromTranslation = fromTranslation;\nexports.fromScaling = fromScaling;\nexports.fromRotation = fromRotation;\nexports.fromXRotation = fromXRotation;\nexports.fromYRotation = fromYRotation;\nexports.fromZRotation = fromZRotation;\nexports.fromRotationTranslation = fromRotationTranslation;\nexports.fromQuat2 = fromQuat2;\nexports.getTranslation = getTranslation;\nexports.getScaling = getScaling;\nexports.getRotation = getRotation;\nexports.fromRotationTranslationScale = fromRotationTranslationScale;\nexports.fromRotationTranslationScaleOrigin = fromRotationTranslationScaleOrigin;\nexports.fromQuat = fromQuat;\nexports.frustum = frustum;\nexports.perspective = perspective;\nexports.perspectiveFromFieldOfView = perspectiveFromFieldOfView;\nexports.ortho = ortho;\nexports.lookAt = lookAt;\nexports.targetTo = targetTo;\nexports.str = str;\nexports.frob = frob;\nexports.add = add;\nexports.subtract = subtract;\nexports.multiplyScalar = multiplyScalar;\nexports.multiplyScalarAndAdd = multiplyScalarAndAdd;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.\n * @module mat4\n */\n\n/**\n * Creates a new identity mat4\n *\n * @returns {mat4} a new 4x4 matrix\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(16);\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = 1;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = 0;\n  out[10] = 1;\n  out[11] = 0;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Creates a new mat4 initialized with values from an existing matrix\n *\n * @param {mat4} a matrix to clone\n * @returns {mat4} a new 4x4 matrix\n */\nfunction clone(a) {\n  var out = new glMatrix.ARRAY_TYPE(16);\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  out[4] = a[4];\n  out[5] = a[5];\n  out[6] = a[6];\n  out[7] = a[7];\n  out[8] = a[8];\n  out[9] = a[9];\n  out[10] = a[10];\n  out[11] = a[11];\n  out[12] = a[12];\n  out[13] = a[13];\n  out[14] = a[14];\n  out[15] = a[15];\n  return out;\n}\n\n/**\n * Copy the values from one mat4 to another\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the source matrix\n * @returns {mat4} out\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  out[4] = a[4];\n  out[5] = a[5];\n  out[6] = a[6];\n  out[7] = a[7];\n  out[8] = a[8];\n  out[9] = a[9];\n  out[10] = a[10];\n  out[11] = a[11];\n  out[12] = a[12];\n  out[13] = a[13];\n  out[14] = a[14];\n  out[15] = a[15];\n  return out;\n}\n\n/**\n * Create a new mat4 with the given values\n *\n * @param {Number} m00 Component in column 0, row 0 position (index 0)\n * @param {Number} m01 Component in column 0, row 1 position (index 1)\n * @param {Number} m02 Component in column 0, row 2 position (index 2)\n * @param {Number} m03 Component in column 0, row 3 position (index 3)\n * @param {Number} m10 Component in column 1, row 0 position (index 4)\n * @param {Number} m11 Component in column 1, row 1 position (index 5)\n * @param {Number} m12 Component in column 1, row 2 position (index 6)\n * @param {Number} m13 Component in column 1, row 3 position (index 7)\n * @param {Number} m20 Component in column 2, row 0 position (index 8)\n * @param {Number} m21 Component in column 2, row 1 position (index 9)\n * @param {Number} m22 Component in column 2, row 2 position (index 10)\n * @param {Number} m23 Component in column 2, row 3 position (index 11)\n * @param {Number} m30 Component in column 3, row 0 position (index 12)\n * @param {Number} m31 Component in column 3, row 1 position (index 13)\n * @param {Number} m32 Component in column 3, row 2 position (index 14)\n * @param {Number} m33 Component in column 3, row 3 position (index 15)\n * @returns {mat4} A new mat4\n */\nfunction fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {\n  var out = new glMatrix.ARRAY_TYPE(16);\n  out[0] = m00;\n  out[1] = m01;\n  out[2] = m02;\n  out[3] = m03;\n  out[4] = m10;\n  out[5] = m11;\n  out[6] = m12;\n  out[7] = m13;\n  out[8] = m20;\n  out[9] = m21;\n  out[10] = m22;\n  out[11] = m23;\n  out[12] = m30;\n  out[13] = m31;\n  out[14] = m32;\n  out[15] = m33;\n  return out;\n}\n\n/**\n * Set the components of a mat4 to the given values\n *\n * @param {mat4} out the receiving matrix\n * @param {Number} m00 Component in column 0, row 0 position (index 0)\n * @param {Number} m01 Component in column 0, row 1 position (index 1)\n * @param {Number} m02 Component in column 0, row 2 position (index 2)\n * @param {Number} m03 Component in column 0, row 3 position (index 3)\n * @param {Number} m10 Component in column 1, row 0 position (index 4)\n * @param {Number} m11 Component in column 1, row 1 position (index 5)\n * @param {Number} m12 Component in column 1, row 2 position (index 6)\n * @param {Number} m13 Component in column 1, row 3 position (index 7)\n * @param {Number} m20 Component in column 2, row 0 position (index 8)\n * @param {Number} m21 Component in column 2, row 1 position (index 9)\n * @param {Number} m22 Component in column 2, row 2 position (index 10)\n * @param {Number} m23 Component in column 2, row 3 position (index 11)\n * @param {Number} m30 Component in column 3, row 0 position (index 12)\n * @param {Number} m31 Component in column 3, row 1 position (index 13)\n * @param {Number} m32 Component in column 3, row 2 position (index 14)\n * @param {Number} m33 Component in column 3, row 3 position (index 15)\n * @returns {mat4} out\n */\nfunction set(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {\n  out[0] = m00;\n  out[1] = m01;\n  out[2] = m02;\n  out[3] = m03;\n  out[4] = m10;\n  out[5] = m11;\n  out[6] = m12;\n  out[7] = m13;\n  out[8] = m20;\n  out[9] = m21;\n  out[10] = m22;\n  out[11] = m23;\n  out[12] = m30;\n  out[13] = m31;\n  out[14] = m32;\n  out[15] = m33;\n  return out;\n}\n\n/**\n * Set a mat4 to the identity matrix\n *\n * @param {mat4} out the receiving matrix\n * @returns {mat4} out\n */\nfunction identity(out) {\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = 1;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = 0;\n  out[10] = 1;\n  out[11] = 0;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Transpose the values of a mat4\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the source matrix\n * @returns {mat4} out\n */\nfunction transpose(out, a) {\n  // If we are transposing ourselves we can skip a few steps but have to cache some values\n  if (out === a) {\n    var a01 = a[1],\n        a02 = a[2],\n        a03 = a[3];\n    var a12 = a[6],\n        a13 = a[7];\n    var a23 = a[11];\n\n    out[1] = a[4];\n    out[2] = a[8];\n    out[3] = a[12];\n    out[4] = a01;\n    out[6] = a[9];\n    out[7] = a[13];\n    out[8] = a02;\n    out[9] = a12;\n    out[11] = a[14];\n    out[12] = a03;\n    out[13] = a13;\n    out[14] = a23;\n  } else {\n    out[0] = a[0];\n    out[1] = a[4];\n    out[2] = a[8];\n    out[3] = a[12];\n    out[4] = a[1];\n    out[5] = a[5];\n    out[6] = a[9];\n    out[7] = a[13];\n    out[8] = a[2];\n    out[9] = a[6];\n    out[10] = a[10];\n    out[11] = a[14];\n    out[12] = a[3];\n    out[13] = a[7];\n    out[14] = a[11];\n    out[15] = a[15];\n  }\n\n  return out;\n}\n\n/**\n * Inverts a mat4\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the source matrix\n * @returns {mat4} out\n */\nfunction invert(out, a) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2],\n      a03 = a[3];\n  var a10 = a[4],\n      a11 = a[5],\n      a12 = a[6],\n      a13 = a[7];\n  var a20 = a[8],\n      a21 = a[9],\n      a22 = a[10],\n      a23 = a[11];\n  var a30 = a[12],\n      a31 = a[13],\n      a32 = a[14],\n      a33 = a[15];\n\n  var b00 = a00 * a11 - a01 * a10;\n  var b01 = a00 * a12 - a02 * a10;\n  var b02 = a00 * a13 - a03 * a10;\n  var b03 = a01 * a12 - a02 * a11;\n  var b04 = a01 * a13 - a03 * a11;\n  var b05 = a02 * a13 - a03 * a12;\n  var b06 = a20 * a31 - a21 * a30;\n  var b07 = a20 * a32 - a22 * a30;\n  var b08 = a20 * a33 - a23 * a30;\n  var b09 = a21 * a32 - a22 * a31;\n  var b10 = a21 * a33 - a23 * a31;\n  var b11 = a22 * a33 - a23 * a32;\n\n  // Calculate the determinant\n  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n\n  if (!det) {\n    return null;\n  }\n  det = 1.0 / det;\n\n  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;\n  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;\n  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;\n  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;\n  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;\n  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;\n  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;\n\n  return out;\n}\n\n/**\n * Calculates the adjugate of a mat4\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the source matrix\n * @returns {mat4} out\n */\nfunction adjoint(out, a) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2],\n      a03 = a[3];\n  var a10 = a[4],\n      a11 = a[5],\n      a12 = a[6],\n      a13 = a[7];\n  var a20 = a[8],\n      a21 = a[9],\n      a22 = a[10],\n      a23 = a[11];\n  var a30 = a[12],\n      a31 = a[13],\n      a32 = a[14],\n      a33 = a[15];\n\n  out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);\n  out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));\n  out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);\n  out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));\n  out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));\n  out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);\n  out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));\n  out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);\n  out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);\n  out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));\n  out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);\n  out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));\n  out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));\n  out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);\n  out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));\n  out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);\n  return out;\n}\n\n/**\n * Calculates the determinant of a mat4\n *\n * @param {mat4} a the source matrix\n * @returns {Number} determinant of a\n */\nfunction determinant(a) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2],\n      a03 = a[3];\n  var a10 = a[4],\n      a11 = a[5],\n      a12 = a[6],\n      a13 = a[7];\n  var a20 = a[8],\n      a21 = a[9],\n      a22 = a[10],\n      a23 = a[11];\n  var a30 = a[12],\n      a31 = a[13],\n      a32 = a[14],\n      a33 = a[15];\n\n  var b00 = a00 * a11 - a01 * a10;\n  var b01 = a00 * a12 - a02 * a10;\n  var b02 = a00 * a13 - a03 * a10;\n  var b03 = a01 * a12 - a02 * a11;\n  var b04 = a01 * a13 - a03 * a11;\n  var b05 = a02 * a13 - a03 * a12;\n  var b06 = a20 * a31 - a21 * a30;\n  var b07 = a20 * a32 - a22 * a30;\n  var b08 = a20 * a33 - a23 * a30;\n  var b09 = a21 * a32 - a22 * a31;\n  var b10 = a21 * a33 - a23 * a31;\n  var b11 = a22 * a33 - a23 * a32;\n\n  // Calculate the determinant\n  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n}\n\n/**\n * Multiplies two mat4s\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the first operand\n * @param {mat4} b the second operand\n * @returns {mat4} out\n */\nfunction multiply(out, a, b) {\n  var a00 = a[0],\n      a01 = a[1],\n      a02 = a[2],\n      a03 = a[3];\n  var a10 = a[4],\n      a11 = a[5],\n      a12 = a[6],\n      a13 = a[7];\n  var a20 = a[8],\n      a21 = a[9],\n      a22 = a[10],\n      a23 = a[11];\n  var a30 = a[12],\n      a31 = a[13],\n      a32 = a[14],\n      a33 = a[15];\n\n  // Cache only the current line of the second matrix\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3];\n  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;\n  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;\n  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;\n  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;\n\n  b0 = b[4];b1 = b[5];b2 = b[6];b3 = b[7];\n  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;\n  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;\n  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;\n  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;\n\n  b0 = b[8];b1 = b[9];b2 = b[10];b3 = b[11];\n  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;\n  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;\n  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;\n  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;\n\n  b0 = b[12];b1 = b[13];b2 = b[14];b3 = b[15];\n  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;\n  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;\n  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;\n  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;\n  return out;\n}\n\n/**\n * Translate a mat4 by the given vector\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the matrix to translate\n * @param {vec3} v vector to translate by\n * @returns {mat4} out\n */\nfunction translate(out, a, v) {\n  var x = v[0],\n      y = v[1],\n      z = v[2];\n  var a00 = void 0,\n      a01 = void 0,\n      a02 = void 0,\n      a03 = void 0;\n  var a10 = void 0,\n      a11 = void 0,\n      a12 = void 0,\n      a13 = void 0;\n  var a20 = void 0,\n      a21 = void 0,\n      a22 = void 0,\n      a23 = void 0;\n\n  if (a === out) {\n    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];\n    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];\n    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];\n    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];\n  } else {\n    a00 = a[0];a01 = a[1];a02 = a[2];a03 = a[3];\n    a10 = a[4];a11 = a[5];a12 = a[6];a13 = a[7];\n    a20 = a[8];a21 = a[9];a22 = a[10];a23 = a[11];\n\n    out[0] = a00;out[1] = a01;out[2] = a02;out[3] = a03;\n    out[4] = a10;out[5] = a11;out[6] = a12;out[7] = a13;\n    out[8] = a20;out[9] = a21;out[10] = a22;out[11] = a23;\n\n    out[12] = a00 * x + a10 * y + a20 * z + a[12];\n    out[13] = a01 * x + a11 * y + a21 * z + a[13];\n    out[14] = a02 * x + a12 * y + a22 * z + a[14];\n    out[15] = a03 * x + a13 * y + a23 * z + a[15];\n  }\n\n  return out;\n}\n\n/**\n * Scales the mat4 by the dimensions in the given vec3 not using vectorization\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the matrix to scale\n * @param {vec3} v the vec3 to scale the matrix by\n * @returns {mat4} out\n **/\nfunction scale(out, a, v) {\n  var x = v[0],\n      y = v[1],\n      z = v[2];\n\n  out[0] = a[0] * x;\n  out[1] = a[1] * x;\n  out[2] = a[2] * x;\n  out[3] = a[3] * x;\n  out[4] = a[4] * y;\n  out[5] = a[5] * y;\n  out[6] = a[6] * y;\n  out[7] = a[7] * y;\n  out[8] = a[8] * z;\n  out[9] = a[9] * z;\n  out[10] = a[10] * z;\n  out[11] = a[11] * z;\n  out[12] = a[12];\n  out[13] = a[13];\n  out[14] = a[14];\n  out[15] = a[15];\n  return out;\n}\n\n/**\n * Rotates a mat4 by the given angle around the given axis\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the matrix to rotate\n * @param {Number} rad the angle to rotate the matrix by\n * @param {vec3} axis the axis to rotate around\n * @returns {mat4} out\n */\nfunction rotate(out, a, rad, axis) {\n  var x = axis[0],\n      y = axis[1],\n      z = axis[2];\n  var len = Math.sqrt(x * x + y * y + z * z);\n  var s = void 0,\n      c = void 0,\n      t = void 0;\n  var a00 = void 0,\n      a01 = void 0,\n      a02 = void 0,\n      a03 = void 0;\n  var a10 = void 0,\n      a11 = void 0,\n      a12 = void 0,\n      a13 = void 0;\n  var a20 = void 0,\n      a21 = void 0,\n      a22 = void 0,\n      a23 = void 0;\n  var b00 = void 0,\n      b01 = void 0,\n      b02 = void 0;\n  var b10 = void 0,\n      b11 = void 0,\n      b12 = void 0;\n  var b20 = void 0,\n      b21 = void 0,\n      b22 = void 0;\n\n  if (len < glMatrix.EPSILON) {\n    return null;\n  }\n\n  len = 1 / len;\n  x *= len;\n  y *= len;\n  z *= len;\n\n  s = Math.sin(rad);\n  c = Math.cos(rad);\n  t = 1 - c;\n\n  a00 = a[0];a01 = a[1];a02 = a[2];a03 = a[3];\n  a10 = a[4];a11 = a[5];a12 = a[6];a13 = a[7];\n  a20 = a[8];a21 = a[9];a22 = a[10];a23 = a[11];\n\n  // Construct the elements of the rotation matrix\n  b00 = x * x * t + c;b01 = y * x * t + z * s;b02 = z * x * t - y * s;\n  b10 = x * y * t - z * s;b11 = y * y * t + c;b12 = z * y * t + x * s;\n  b20 = x * z * t + y * s;b21 = y * z * t - x * s;b22 = z * z * t + c;\n\n  // Perform rotation-specific matrix multiplication\n  out[0] = a00 * b00 + a10 * b01 + a20 * b02;\n  out[1] = a01 * b00 + a11 * b01 + a21 * b02;\n  out[2] = a02 * b00 + a12 * b01 + a22 * b02;\n  out[3] = a03 * b00 + a13 * b01 + a23 * b02;\n  out[4] = a00 * b10 + a10 * b11 + a20 * b12;\n  out[5] = a01 * b10 + a11 * b11 + a21 * b12;\n  out[6] = a02 * b10 + a12 * b11 + a22 * b12;\n  out[7] = a03 * b10 + a13 * b11 + a23 * b12;\n  out[8] = a00 * b20 + a10 * b21 + a20 * b22;\n  out[9] = a01 * b20 + a11 * b21 + a21 * b22;\n  out[10] = a02 * b20 + a12 * b21 + a22 * b22;\n  out[11] = a03 * b20 + a13 * b21 + a23 * b22;\n\n  if (a !== out) {\n    // If the source and destination differ, copy the unchanged last row\n    out[12] = a[12];\n    out[13] = a[13];\n    out[14] = a[14];\n    out[15] = a[15];\n  }\n  return out;\n}\n\n/**\n * Rotates a matrix by the given angle around the X axis\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the matrix to rotate\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat4} out\n */\nfunction rotateX(out, a, rad) {\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n  var a10 = a[4];\n  var a11 = a[5];\n  var a12 = a[6];\n  var a13 = a[7];\n  var a20 = a[8];\n  var a21 = a[9];\n  var a22 = a[10];\n  var a23 = a[11];\n\n  if (a !== out) {\n    // If the source and destination differ, copy the unchanged rows\n    out[0] = a[0];\n    out[1] = a[1];\n    out[2] = a[2];\n    out[3] = a[3];\n    out[12] = a[12];\n    out[13] = a[13];\n    out[14] = a[14];\n    out[15] = a[15];\n  }\n\n  // Perform axis-specific matrix multiplication\n  out[4] = a10 * c + a20 * s;\n  out[5] = a11 * c + a21 * s;\n  out[6] = a12 * c + a22 * s;\n  out[7] = a13 * c + a23 * s;\n  out[8] = a20 * c - a10 * s;\n  out[9] = a21 * c - a11 * s;\n  out[10] = a22 * c - a12 * s;\n  out[11] = a23 * c - a13 * s;\n  return out;\n}\n\n/**\n * Rotates a matrix by the given angle around the Y axis\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the matrix to rotate\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat4} out\n */\nfunction rotateY(out, a, rad) {\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n  var a00 = a[0];\n  var a01 = a[1];\n  var a02 = a[2];\n  var a03 = a[3];\n  var a20 = a[8];\n  var a21 = a[9];\n  var a22 = a[10];\n  var a23 = a[11];\n\n  if (a !== out) {\n    // If the source and destination differ, copy the unchanged rows\n    out[4] = a[4];\n    out[5] = a[5];\n    out[6] = a[6];\n    out[7] = a[7];\n    out[12] = a[12];\n    out[13] = a[13];\n    out[14] = a[14];\n    out[15] = a[15];\n  }\n\n  // Perform axis-specific matrix multiplication\n  out[0] = a00 * c - a20 * s;\n  out[1] = a01 * c - a21 * s;\n  out[2] = a02 * c - a22 * s;\n  out[3] = a03 * c - a23 * s;\n  out[8] = a00 * s + a20 * c;\n  out[9] = a01 * s + a21 * c;\n  out[10] = a02 * s + a22 * c;\n  out[11] = a03 * s + a23 * c;\n  return out;\n}\n\n/**\n * Rotates a matrix by the given angle around the Z axis\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the matrix to rotate\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat4} out\n */\nfunction rotateZ(out, a, rad) {\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n  var a00 = a[0];\n  var a01 = a[1];\n  var a02 = a[2];\n  var a03 = a[3];\n  var a10 = a[4];\n  var a11 = a[5];\n  var a12 = a[6];\n  var a13 = a[7];\n\n  if (a !== out) {\n    // If the source and destination differ, copy the unchanged last row\n    out[8] = a[8];\n    out[9] = a[9];\n    out[10] = a[10];\n    out[11] = a[11];\n    out[12] = a[12];\n    out[13] = a[13];\n    out[14] = a[14];\n    out[15] = a[15];\n  }\n\n  // Perform axis-specific matrix multiplication\n  out[0] = a00 * c + a10 * s;\n  out[1] = a01 * c + a11 * s;\n  out[2] = a02 * c + a12 * s;\n  out[3] = a03 * c + a13 * s;\n  out[4] = a10 * c - a00 * s;\n  out[5] = a11 * c - a01 * s;\n  out[6] = a12 * c - a02 * s;\n  out[7] = a13 * c - a03 * s;\n  return out;\n}\n\n/**\n * Creates a matrix from a vector translation\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.translate(dest, dest, vec);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {vec3} v Translation vector\n * @returns {mat4} out\n */\nfunction fromTranslation(out, v) {\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = 1;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = 0;\n  out[10] = 1;\n  out[11] = 0;\n  out[12] = v[0];\n  out[13] = v[1];\n  out[14] = v[2];\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from a vector scaling\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.scale(dest, dest, vec);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {vec3} v Scaling vector\n * @returns {mat4} out\n */\nfunction fromScaling(out, v) {\n  out[0] = v[0];\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = v[1];\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = 0;\n  out[10] = v[2];\n  out[11] = 0;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from a given angle around a given axis\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.rotate(dest, dest, rad, axis);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {Number} rad the angle to rotate the matrix by\n * @param {vec3} axis the axis to rotate around\n * @returns {mat4} out\n */\nfunction fromRotation(out, rad, axis) {\n  var x = axis[0],\n      y = axis[1],\n      z = axis[2];\n  var len = Math.sqrt(x * x + y * y + z * z);\n  var s = void 0,\n      c = void 0,\n      t = void 0;\n\n  if (len < glMatrix.EPSILON) {\n    return null;\n  }\n\n  len = 1 / len;\n  x *= len;\n  y *= len;\n  z *= len;\n\n  s = Math.sin(rad);\n  c = Math.cos(rad);\n  t = 1 - c;\n\n  // Perform rotation-specific matrix multiplication\n  out[0] = x * x * t + c;\n  out[1] = y * x * t + z * s;\n  out[2] = z * x * t - y * s;\n  out[3] = 0;\n  out[4] = x * y * t - z * s;\n  out[5] = y * y * t + c;\n  out[6] = z * y * t + x * s;\n  out[7] = 0;\n  out[8] = x * z * t + y * s;\n  out[9] = y * z * t - x * s;\n  out[10] = z * z * t + c;\n  out[11] = 0;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from the given angle around the X axis\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.rotateX(dest, dest, rad);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat4} out\n */\nfunction fromXRotation(out, rad) {\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n\n  // Perform axis-specific matrix multiplication\n  out[0] = 1;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = c;\n  out[6] = s;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = -s;\n  out[10] = c;\n  out[11] = 0;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from the given angle around the Y axis\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.rotateY(dest, dest, rad);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat4} out\n */\nfunction fromYRotation(out, rad) {\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n\n  // Perform axis-specific matrix multiplication\n  out[0] = c;\n  out[1] = 0;\n  out[2] = -s;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = 1;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = s;\n  out[9] = 0;\n  out[10] = c;\n  out[11] = 0;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from the given angle around the Z axis\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.rotateZ(dest, dest, rad);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {Number} rad the angle to rotate the matrix by\n * @returns {mat4} out\n */\nfunction fromZRotation(out, rad) {\n  var s = Math.sin(rad);\n  var c = Math.cos(rad);\n\n  // Perform axis-specific matrix multiplication\n  out[0] = c;\n  out[1] = s;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = -s;\n  out[5] = c;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = 0;\n  out[10] = 1;\n  out[11] = 0;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Creates a matrix from a quaternion rotation and vector translation\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.translate(dest, vec);\n *     let quatMat = mat4.create();\n *     quat4.toMat4(quat, quatMat);\n *     mat4.multiply(dest, quatMat);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {quat4} q Rotation quaternion\n * @param {vec3} v Translation vector\n * @returns {mat4} out\n */\nfunction fromRotationTranslation(out, q, v) {\n  // Quaternion math\n  var x = q[0],\n      y = q[1],\n      z = q[2],\n      w = q[3];\n  var x2 = x + x;\n  var y2 = y + y;\n  var z2 = z + z;\n\n  var xx = x * x2;\n  var xy = x * y2;\n  var xz = x * z2;\n  var yy = y * y2;\n  var yz = y * z2;\n  var zz = z * z2;\n  var wx = w * x2;\n  var wy = w * y2;\n  var wz = w * z2;\n\n  out[0] = 1 - (yy + zz);\n  out[1] = xy + wz;\n  out[2] = xz - wy;\n  out[3] = 0;\n  out[4] = xy - wz;\n  out[5] = 1 - (xx + zz);\n  out[6] = yz + wx;\n  out[7] = 0;\n  out[8] = xz + wy;\n  out[9] = yz - wx;\n  out[10] = 1 - (xx + yy);\n  out[11] = 0;\n  out[12] = v[0];\n  out[13] = v[1];\n  out[14] = v[2];\n  out[15] = 1;\n\n  return out;\n}\n\n/**\n * Creates a new mat4 from a dual quat.\n *\n * @param {mat4} out Matrix\n * @param {quat2} a Dual Quaternion\n * @returns {mat4} mat4 receiving operation result\n */\nfunction fromQuat2(out, a) {\n  var translation = new glMatrix.ARRAY_TYPE(3);\n  var bx = -a[0],\n      by = -a[1],\n      bz = -a[2],\n      bw = a[3],\n      ax = a[4],\n      ay = a[5],\n      az = a[6],\n      aw = a[7];\n\n  var magnitude = bx * bx + by * by + bz * bz + bw * bw;\n  //Only scale if it makes sense\n  if (magnitude > 0) {\n    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;\n    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;\n    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;\n  } else {\n    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;\n    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;\n    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;\n  }\n  fromRotationTranslation(out, a, translation);\n  return out;\n}\n\n/**\n * Returns the translation vector component of a transformation\n *  matrix. If a matrix is built with fromRotationTranslation,\n *  the returned vector will be the same as the translation vector\n *  originally supplied.\n * @param  {vec3} out Vector to receive translation component\n * @param  {mat4} mat Matrix to be decomposed (input)\n * @return {vec3} out\n */\nfunction getTranslation(out, mat) {\n  out[0] = mat[12];\n  out[1] = mat[13];\n  out[2] = mat[14];\n\n  return out;\n}\n\n/**\n * Returns the scaling factor component of a transformation\n *  matrix. If a matrix is built with fromRotationTranslationScale\n *  with a normalized Quaternion paramter, the returned vector will be\n *  the same as the scaling vector\n *  originally supplied.\n * @param  {vec3} out Vector to receive scaling factor component\n * @param  {mat4} mat Matrix to be decomposed (input)\n * @return {vec3} out\n */\nfunction getScaling(out, mat) {\n  var m11 = mat[0];\n  var m12 = mat[1];\n  var m13 = mat[2];\n  var m21 = mat[4];\n  var m22 = mat[5];\n  var m23 = mat[6];\n  var m31 = mat[8];\n  var m32 = mat[9];\n  var m33 = mat[10];\n\n  out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);\n  out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);\n  out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);\n\n  return out;\n}\n\n/**\n * Returns a quaternion representing the rotational component\n *  of a transformation matrix. If a matrix is built with\n *  fromRotationTranslation, the returned quaternion will be the\n *  same as the quaternion originally supplied.\n * @param {quat} out Quaternion to receive the rotation component\n * @param {mat4} mat Matrix to be decomposed (input)\n * @return {quat} out\n */\nfunction getRotation(out, mat) {\n  // Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm\n  var trace = mat[0] + mat[5] + mat[10];\n  var S = 0;\n\n  if (trace > 0) {\n    S = Math.sqrt(trace + 1.0) * 2;\n    out[3] = 0.25 * S;\n    out[0] = (mat[6] - mat[9]) / S;\n    out[1] = (mat[8] - mat[2]) / S;\n    out[2] = (mat[1] - mat[4]) / S;\n  } else if (mat[0] > mat[5] && mat[0] > mat[10]) {\n    S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;\n    out[3] = (mat[6] - mat[9]) / S;\n    out[0] = 0.25 * S;\n    out[1] = (mat[1] + mat[4]) / S;\n    out[2] = (mat[8] + mat[2]) / S;\n  } else if (mat[5] > mat[10]) {\n    S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;\n    out[3] = (mat[8] - mat[2]) / S;\n    out[0] = (mat[1] + mat[4]) / S;\n    out[1] = 0.25 * S;\n    out[2] = (mat[6] + mat[9]) / S;\n  } else {\n    S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;\n    out[3] = (mat[1] - mat[4]) / S;\n    out[0] = (mat[8] + mat[2]) / S;\n    out[1] = (mat[6] + mat[9]) / S;\n    out[2] = 0.25 * S;\n  }\n\n  return out;\n}\n\n/**\n * Creates a matrix from a quaternion rotation, vector translation and vector scale\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.translate(dest, vec);\n *     let quatMat = mat4.create();\n *     quat4.toMat4(quat, quatMat);\n *     mat4.multiply(dest, quatMat);\n *     mat4.scale(dest, scale)\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {quat4} q Rotation quaternion\n * @param {vec3} v Translation vector\n * @param {vec3} s Scaling vector\n * @returns {mat4} out\n */\nfunction fromRotationTranslationScale(out, q, v, s) {\n  // Quaternion math\n  var x = q[0],\n      y = q[1],\n      z = q[2],\n      w = q[3];\n  var x2 = x + x;\n  var y2 = y + y;\n  var z2 = z + z;\n\n  var xx = x * x2;\n  var xy = x * y2;\n  var xz = x * z2;\n  var yy = y * y2;\n  var yz = y * z2;\n  var zz = z * z2;\n  var wx = w * x2;\n  var wy = w * y2;\n  var wz = w * z2;\n  var sx = s[0];\n  var sy = s[1];\n  var sz = s[2];\n\n  out[0] = (1 - (yy + zz)) * sx;\n  out[1] = (xy + wz) * sx;\n  out[2] = (xz - wy) * sx;\n  out[3] = 0;\n  out[4] = (xy - wz) * sy;\n  out[5] = (1 - (xx + zz)) * sy;\n  out[6] = (yz + wx) * sy;\n  out[7] = 0;\n  out[8] = (xz + wy) * sz;\n  out[9] = (yz - wx) * sz;\n  out[10] = (1 - (xx + yy)) * sz;\n  out[11] = 0;\n  out[12] = v[0];\n  out[13] = v[1];\n  out[14] = v[2];\n  out[15] = 1;\n\n  return out;\n}\n\n/**\n * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin\n * This is equivalent to (but much faster than):\n *\n *     mat4.identity(dest);\n *     mat4.translate(dest, vec);\n *     mat4.translate(dest, origin);\n *     let quatMat = mat4.create();\n *     quat4.toMat4(quat, quatMat);\n *     mat4.multiply(dest, quatMat);\n *     mat4.scale(dest, scale)\n *     mat4.translate(dest, negativeOrigin);\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {quat4} q Rotation quaternion\n * @param {vec3} v Translation vector\n * @param {vec3} s Scaling vector\n * @param {vec3} o The origin vector around which to scale and rotate\n * @returns {mat4} out\n */\nfunction fromRotationTranslationScaleOrigin(out, q, v, s, o) {\n  // Quaternion math\n  var x = q[0],\n      y = q[1],\n      z = q[2],\n      w = q[3];\n  var x2 = x + x;\n  var y2 = y + y;\n  var z2 = z + z;\n\n  var xx = x * x2;\n  var xy = x * y2;\n  var xz = x * z2;\n  var yy = y * y2;\n  var yz = y * z2;\n  var zz = z * z2;\n  var wx = w * x2;\n  var wy = w * y2;\n  var wz = w * z2;\n\n  var sx = s[0];\n  var sy = s[1];\n  var sz = s[2];\n\n  var ox = o[0];\n  var oy = o[1];\n  var oz = o[2];\n\n  var out0 = (1 - (yy + zz)) * sx;\n  var out1 = (xy + wz) * sx;\n  var out2 = (xz - wy) * sx;\n  var out4 = (xy - wz) * sy;\n  var out5 = (1 - (xx + zz)) * sy;\n  var out6 = (yz + wx) * sy;\n  var out8 = (xz + wy) * sz;\n  var out9 = (yz - wx) * sz;\n  var out10 = (1 - (xx + yy)) * sz;\n\n  out[0] = out0;\n  out[1] = out1;\n  out[2] = out2;\n  out[3] = 0;\n  out[4] = out4;\n  out[5] = out5;\n  out[6] = out6;\n  out[7] = 0;\n  out[8] = out8;\n  out[9] = out9;\n  out[10] = out10;\n  out[11] = 0;\n  out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);\n  out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);\n  out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);\n  out[15] = 1;\n\n  return out;\n}\n\n/**\n * Calculates a 4x4 matrix from the given quaternion\n *\n * @param {mat4} out mat4 receiving operation result\n * @param {quat} q Quaternion to create matrix from\n *\n * @returns {mat4} out\n */\nfunction fromQuat(out, q) {\n  var x = q[0],\n      y = q[1],\n      z = q[2],\n      w = q[3];\n  var x2 = x + x;\n  var y2 = y + y;\n  var z2 = z + z;\n\n  var xx = x * x2;\n  var yx = y * x2;\n  var yy = y * y2;\n  var zx = z * x2;\n  var zy = z * y2;\n  var zz = z * z2;\n  var wx = w * x2;\n  var wy = w * y2;\n  var wz = w * z2;\n\n  out[0] = 1 - yy - zz;\n  out[1] = yx + wz;\n  out[2] = zx - wy;\n  out[3] = 0;\n\n  out[4] = yx - wz;\n  out[5] = 1 - xx - zz;\n  out[6] = zy + wx;\n  out[7] = 0;\n\n  out[8] = zx + wy;\n  out[9] = zy - wx;\n  out[10] = 1 - xx - yy;\n  out[11] = 0;\n\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 0;\n  out[15] = 1;\n\n  return out;\n}\n\n/**\n * Generates a frustum matrix with the given bounds\n *\n * @param {mat4} out mat4 frustum matrix will be written into\n * @param {Number} left Left bound of the frustum\n * @param {Number} right Right bound of the frustum\n * @param {Number} bottom Bottom bound of the frustum\n * @param {Number} top Top bound of the frustum\n * @param {Number} near Near bound of the frustum\n * @param {Number} far Far bound of the frustum\n * @returns {mat4} out\n */\nfunction frustum(out, left, right, bottom, top, near, far) {\n  var rl = 1 / (right - left);\n  var tb = 1 / (top - bottom);\n  var nf = 1 / (near - far);\n  out[0] = near * 2 * rl;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = near * 2 * tb;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = (right + left) * rl;\n  out[9] = (top + bottom) * tb;\n  out[10] = (far + near) * nf;\n  out[11] = -1;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = far * near * 2 * nf;\n  out[15] = 0;\n  return out;\n}\n\n/**\n * Generates a perspective projection matrix with the given bounds\n *\n * @param {mat4} out mat4 frustum matrix will be written into\n * @param {number} fovy Vertical field of view in radians\n * @param {number} aspect Aspect ratio. typically viewport width/height\n * @param {number} near Near bound of the frustum\n * @param {number} far Far bound of the frustum\n * @returns {mat4} out\n */\nfunction perspective(out, fovy, aspect, near, far) {\n  var f = 1.0 / Math.tan(fovy / 2);\n  var nf = 1 / (near - far);\n  out[0] = f / aspect;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = f;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = 0;\n  out[10] = (far + near) * nf;\n  out[11] = -1;\n  out[12] = 0;\n  out[13] = 0;\n  out[14] = 2 * far * near * nf;\n  out[15] = 0;\n  return out;\n}\n\n/**\n * Generates a perspective projection matrix with the given field of view.\n * This is primarily useful for generating projection matrices to be used\n * with the still experiemental WebVR API.\n *\n * @param {mat4} out mat4 frustum matrix will be written into\n * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees\n * @param {number} near Near bound of the frustum\n * @param {number} far Far bound of the frustum\n * @returns {mat4} out\n */\nfunction perspectiveFromFieldOfView(out, fov, near, far) {\n  var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);\n  var downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);\n  var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);\n  var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);\n  var xScale = 2.0 / (leftTan + rightTan);\n  var yScale = 2.0 / (upTan + downTan);\n\n  out[0] = xScale;\n  out[1] = 0.0;\n  out[2] = 0.0;\n  out[3] = 0.0;\n  out[4] = 0.0;\n  out[5] = yScale;\n  out[6] = 0.0;\n  out[7] = 0.0;\n  out[8] = -((leftTan - rightTan) * xScale * 0.5);\n  out[9] = (upTan - downTan) * yScale * 0.5;\n  out[10] = far / (near - far);\n  out[11] = -1.0;\n  out[12] = 0.0;\n  out[13] = 0.0;\n  out[14] = far * near / (near - far);\n  out[15] = 0.0;\n  return out;\n}\n\n/**\n * Generates a orthogonal projection matrix with the given bounds\n *\n * @param {mat4} out mat4 frustum matrix will be written into\n * @param {number} left Left bound of the frustum\n * @param {number} right Right bound of the frustum\n * @param {number} bottom Bottom bound of the frustum\n * @param {number} top Top bound of the frustum\n * @param {number} near Near bound of the frustum\n * @param {number} far Far bound of the frustum\n * @returns {mat4} out\n */\nfunction ortho(out, left, right, bottom, top, near, far) {\n  var lr = 1 / (left - right);\n  var bt = 1 / (bottom - top);\n  var nf = 1 / (near - far);\n  out[0] = -2 * lr;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  out[4] = 0;\n  out[5] = -2 * bt;\n  out[6] = 0;\n  out[7] = 0;\n  out[8] = 0;\n  out[9] = 0;\n  out[10] = 2 * nf;\n  out[11] = 0;\n  out[12] = (left + right) * lr;\n  out[13] = (top + bottom) * bt;\n  out[14] = (far + near) * nf;\n  out[15] = 1;\n  return out;\n}\n\n/**\n * Generates a look-at matrix with the given eye position, focal point, and up axis.\n * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.\n *\n * @param {mat4} out mat4 frustum matrix will be written into\n * @param {vec3} eye Position of the viewer\n * @param {vec3} center Point the viewer is looking at\n * @param {vec3} up vec3 pointing up\n * @returns {mat4} out\n */\nfunction lookAt(out, eye, center, up) {\n  var x0 = void 0,\n      x1 = void 0,\n      x2 = void 0,\n      y0 = void 0,\n      y1 = void 0,\n      y2 = void 0,\n      z0 = void 0,\n      z1 = void 0,\n      z2 = void 0,\n      len = void 0;\n  var eyex = eye[0];\n  var eyey = eye[1];\n  var eyez = eye[2];\n  var upx = up[0];\n  var upy = up[1];\n  var upz = up[2];\n  var centerx = center[0];\n  var centery = center[1];\n  var centerz = center[2];\n\n  if (Math.abs(eyex - centerx) < glMatrix.EPSILON && Math.abs(eyey - centery) < glMatrix.EPSILON && Math.abs(eyez - centerz) < glMatrix.EPSILON) {\n    return identity(out);\n  }\n\n  z0 = eyex - centerx;\n  z1 = eyey - centery;\n  z2 = eyez - centerz;\n\n  len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);\n  z0 *= len;\n  z1 *= len;\n  z2 *= len;\n\n  x0 = upy * z2 - upz * z1;\n  x1 = upz * z0 - upx * z2;\n  x2 = upx * z1 - upy * z0;\n  len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);\n  if (!len) {\n    x0 = 0;\n    x1 = 0;\n    x2 = 0;\n  } else {\n    len = 1 / len;\n    x0 *= len;\n    x1 *= len;\n    x2 *= len;\n  }\n\n  y0 = z1 * x2 - z2 * x1;\n  y1 = z2 * x0 - z0 * x2;\n  y2 = z0 * x1 - z1 * x0;\n\n  len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);\n  if (!len) {\n    y0 = 0;\n    y1 = 0;\n    y2 = 0;\n  } else {\n    len = 1 / len;\n    y0 *= len;\n    y1 *= len;\n    y2 *= len;\n  }\n\n  out[0] = x0;\n  out[1] = y0;\n  out[2] = z0;\n  out[3] = 0;\n  out[4] = x1;\n  out[5] = y1;\n  out[6] = z1;\n  out[7] = 0;\n  out[8] = x2;\n  out[9] = y2;\n  out[10] = z2;\n  out[11] = 0;\n  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);\n  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);\n  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);\n  out[15] = 1;\n\n  return out;\n}\n\n/**\n * Generates a matrix that makes something look at something else.\n *\n * @param {mat4} out mat4 frustum matrix will be written into\n * @param {vec3} eye Position of the viewer\n * @param {vec3} center Point the viewer is looking at\n * @param {vec3} up vec3 pointing up\n * @returns {mat4} out\n */\nfunction targetTo(out, eye, target, up) {\n  var eyex = eye[0],\n      eyey = eye[1],\n      eyez = eye[2],\n      upx = up[0],\n      upy = up[1],\n      upz = up[2];\n\n  var z0 = eyex - target[0],\n      z1 = eyey - target[1],\n      z2 = eyez - target[2];\n\n  var len = z0 * z0 + z1 * z1 + z2 * z2;\n  if (len > 0) {\n    len = 1 / Math.sqrt(len);\n    z0 *= len;\n    z1 *= len;\n    z2 *= len;\n  }\n\n  var x0 = upy * z2 - upz * z1,\n      x1 = upz * z0 - upx * z2,\n      x2 = upx * z1 - upy * z0;\n\n  len = x0 * x0 + x1 * x1 + x2 * x2;\n  if (len > 0) {\n    len = 1 / Math.sqrt(len);\n    x0 *= len;\n    x1 *= len;\n    x2 *= len;\n  }\n\n  out[0] = x0;\n  out[1] = x1;\n  out[2] = x2;\n  out[3] = 0;\n  out[4] = z1 * x2 - z2 * x1;\n  out[5] = z2 * x0 - z0 * x2;\n  out[6] = z0 * x1 - z1 * x0;\n  out[7] = 0;\n  out[8] = z0;\n  out[9] = z1;\n  out[10] = z2;\n  out[11] = 0;\n  out[12] = eyex;\n  out[13] = eyey;\n  out[14] = eyez;\n  out[15] = 1;\n  return out;\n};\n\n/**\n * Returns a string representation of a mat4\n *\n * @param {mat4} a matrix to represent as a string\n * @returns {String} string representation of the matrix\n */\nfunction str(a) {\n  return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' + a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';\n}\n\n/**\n * Returns Frobenius norm of a mat4\n *\n * @param {mat4} a the matrix to calculate Frobenius norm of\n * @returns {Number} Frobenius norm\n */\nfunction frob(a) {\n  return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2));\n}\n\n/**\n * Adds two mat4's\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the first operand\n * @param {mat4} b the second operand\n * @returns {mat4} out\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  out[2] = a[2] + b[2];\n  out[3] = a[3] + b[3];\n  out[4] = a[4] + b[4];\n  out[5] = a[5] + b[5];\n  out[6] = a[6] + b[6];\n  out[7] = a[7] + b[7];\n  out[8] = a[8] + b[8];\n  out[9] = a[9] + b[9];\n  out[10] = a[10] + b[10];\n  out[11] = a[11] + b[11];\n  out[12] = a[12] + b[12];\n  out[13] = a[13] + b[13];\n  out[14] = a[14] + b[14];\n  out[15] = a[15] + b[15];\n  return out;\n}\n\n/**\n * Subtracts matrix b from matrix a\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the first operand\n * @param {mat4} b the second operand\n * @returns {mat4} out\n */\nfunction subtract(out, a, b) {\n  out[0] = a[0] - b[0];\n  out[1] = a[1] - b[1];\n  out[2] = a[2] - b[2];\n  out[3] = a[3] - b[3];\n  out[4] = a[4] - b[4];\n  out[5] = a[5] - b[5];\n  out[6] = a[6] - b[6];\n  out[7] = a[7] - b[7];\n  out[8] = a[8] - b[8];\n  out[9] = a[9] - b[9];\n  out[10] = a[10] - b[10];\n  out[11] = a[11] - b[11];\n  out[12] = a[12] - b[12];\n  out[13] = a[13] - b[13];\n  out[14] = a[14] - b[14];\n  out[15] = a[15] - b[15];\n  return out;\n}\n\n/**\n * Multiply each element of the matrix by a scalar.\n *\n * @param {mat4} out the receiving matrix\n * @param {mat4} a the matrix to scale\n * @param {Number} b amount to scale the matrix's elements by\n * @returns {mat4} out\n */\nfunction multiplyScalar(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  out[2] = a[2] * b;\n  out[3] = a[3] * b;\n  out[4] = a[4] * b;\n  out[5] = a[5] * b;\n  out[6] = a[6] * b;\n  out[7] = a[7] * b;\n  out[8] = a[8] * b;\n  out[9] = a[9] * b;\n  out[10] = a[10] * b;\n  out[11] = a[11] * b;\n  out[12] = a[12] * b;\n  out[13] = a[13] * b;\n  out[14] = a[14] * b;\n  out[15] = a[15] * b;\n  return out;\n}\n\n/**\n * Adds two mat4's after multiplying each element of the second operand by a scalar value.\n *\n * @param {mat4} out the receiving vector\n * @param {mat4} a the first operand\n * @param {mat4} b the second operand\n * @param {Number} scale the amount to scale b's elements by before adding\n * @returns {mat4} out\n */\nfunction multiplyScalarAndAdd(out, a, b, scale) {\n  out[0] = a[0] + b[0] * scale;\n  out[1] = a[1] + b[1] * scale;\n  out[2] = a[2] + b[2] * scale;\n  out[3] = a[3] + b[3] * scale;\n  out[4] = a[4] + b[4] * scale;\n  out[5] = a[5] + b[5] * scale;\n  out[6] = a[6] + b[6] * scale;\n  out[7] = a[7] + b[7] * scale;\n  out[8] = a[8] + b[8] * scale;\n  out[9] = a[9] + b[9] * scale;\n  out[10] = a[10] + b[10] * scale;\n  out[11] = a[11] + b[11] * scale;\n  out[12] = a[12] + b[12] * scale;\n  out[13] = a[13] + b[13] * scale;\n  out[14] = a[14] + b[14] * scale;\n  out[15] = a[15] + b[15] * scale;\n  return out;\n}\n\n/**\n * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)\n *\n * @param {mat4} a The first matrix.\n * @param {mat4} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];\n}\n\n/**\n * Returns whether or not the matrices have approximately the same elements in the same position.\n *\n * @param {mat4} a The first matrix.\n * @param {mat4} b The second matrix.\n * @returns {Boolean} True if the matrices are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n  var a4 = a[4],\n      a5 = a[5],\n      a6 = a[6],\n      a7 = a[7];\n  var a8 = a[8],\n      a9 = a[9],\n      a10 = a[10],\n      a11 = a[11];\n  var a12 = a[12],\n      a13 = a[13],\n      a14 = a[14],\n      a15 = a[15];\n\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3];\n  var b4 = b[4],\n      b5 = b[5],\n      b6 = b[6],\n      b7 = b[7];\n  var b8 = b[8],\n      b9 = b[9],\n      b10 = b[10],\n      b11 = b[11];\n  var b12 = b[12],\n      b13 = b[13],\n      b14 = b[14],\n      b15 = b[15];\n\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a15), Math.abs(b15));\n}\n\n/**\n * Alias for {@link mat4.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Alias for {@link mat4.subtract}\n * @function\n */\nvar sub = exports.sub = subtract;\n\n//# sourceURL=webpack:///./src/gl-matrix/mat4.js?");

/***/ }),

/***/ "./src/gl-matrix/quat.js":
/*!*******************************!*\
  !*** ./src/gl-matrix/quat.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.setAxes = exports.sqlerp = exports.rotationTo = exports.equals = exports.exactEquals = exports.normalize = exports.sqrLen = exports.squaredLength = exports.len = exports.length = exports.lerp = exports.dot = exports.scale = exports.mul = exports.add = exports.set = exports.copy = exports.fromValues = exports.clone = undefined;\nexports.create = create;\nexports.identity = identity;\nexports.setAxisAngle = setAxisAngle;\nexports.getAxisAngle = getAxisAngle;\nexports.multiply = multiply;\nexports.rotateX = rotateX;\nexports.rotateY = rotateY;\nexports.rotateZ = rotateZ;\nexports.calculateW = calculateW;\nexports.slerp = slerp;\nexports.invert = invert;\nexports.conjugate = conjugate;\nexports.fromMat3 = fromMat3;\nexports.fromEuler = fromEuler;\nexports.str = str;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nvar _mat = __webpack_require__(/*! ./mat3.js */ \"./src/gl-matrix/mat3.js\");\n\nvar mat3 = _interopRequireWildcard(_mat);\n\nvar _vec = __webpack_require__(/*! ./vec3.js */ \"./src/gl-matrix/vec3.js\");\n\nvar vec3 = _interopRequireWildcard(_vec);\n\nvar _vec2 = __webpack_require__(/*! ./vec4.js */ \"./src/gl-matrix/vec4.js\");\n\nvar vec4 = _interopRequireWildcard(_vec2);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * Quaternion\n * @module quat\n */\n\n/**\n * Creates a new identity quat\n *\n * @returns {quat} a new quaternion\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(4);\n  out[0] = 0;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  return out;\n}\n\n/**\n * Set a quat to the identity quaternion\n *\n * @param {quat} out the receiving quaternion\n * @returns {quat} out\n */\nfunction identity(out) {\n  out[0] = 0;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  return out;\n}\n\n/**\n * Sets a quat from the given angle and rotation axis,\n * then returns it.\n *\n * @param {quat} out the receiving quaternion\n * @param {vec3} axis the axis around which to rotate\n * @param {Number} rad the angle in radians\n * @returns {quat} out\n **/\nfunction setAxisAngle(out, axis, rad) {\n  rad = rad * 0.5;\n  var s = Math.sin(rad);\n  out[0] = s * axis[0];\n  out[1] = s * axis[1];\n  out[2] = s * axis[2];\n  out[3] = Math.cos(rad);\n  return out;\n}\n\n/**\n * Gets the rotation axis and angle for a given\n *  quaternion. If a quaternion is created with\n *  setAxisAngle, this method will return the same\n *  values as providied in the original parameter list\n *  OR functionally equivalent values.\n * Example: The quaternion formed by axis [0, 0, 1] and\n *  angle -90 is the same as the quaternion formed by\n *  [0, 0, 1] and 270. This method favors the latter.\n * @param  {vec3} out_axis  Vector receiving the axis of rotation\n * @param  {quat} q     Quaternion to be decomposed\n * @return {Number}     Angle, in radians, of the rotation\n */\nfunction getAxisAngle(out_axis, q) {\n  var rad = Math.acos(q[3]) * 2.0;\n  var s = Math.sin(rad / 2.0);\n  if (s != 0.0) {\n    out_axis[0] = q[0] / s;\n    out_axis[1] = q[1] / s;\n    out_axis[2] = q[2] / s;\n  } else {\n    // If s is zero, return any axis (no rotation - axis does not matter)\n    out_axis[0] = 1;\n    out_axis[1] = 0;\n    out_axis[2] = 0;\n  }\n  return rad;\n}\n\n/**\n * Multiplies two quat's\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a the first operand\n * @param {quat} b the second operand\n * @returns {quat} out\n */\nfunction multiply(out, a, b) {\n  var ax = a[0],\n      ay = a[1],\n      az = a[2],\n      aw = a[3];\n  var bx = b[0],\n      by = b[1],\n      bz = b[2],\n      bw = b[3];\n\n  out[0] = ax * bw + aw * bx + ay * bz - az * by;\n  out[1] = ay * bw + aw * by + az * bx - ax * bz;\n  out[2] = az * bw + aw * bz + ax * by - ay * bx;\n  out[3] = aw * bw - ax * bx - ay * by - az * bz;\n  return out;\n}\n\n/**\n * Rotates a quaternion by the given angle about the X axis\n *\n * @param {quat} out quat receiving operation result\n * @param {quat} a quat to rotate\n * @param {number} rad angle (in radians) to rotate\n * @returns {quat} out\n */\nfunction rotateX(out, a, rad) {\n  rad *= 0.5;\n\n  var ax = a[0],\n      ay = a[1],\n      az = a[2],\n      aw = a[3];\n  var bx = Math.sin(rad),\n      bw = Math.cos(rad);\n\n  out[0] = ax * bw + aw * bx;\n  out[1] = ay * bw + az * bx;\n  out[2] = az * bw - ay * bx;\n  out[3] = aw * bw - ax * bx;\n  return out;\n}\n\n/**\n * Rotates a quaternion by the given angle about the Y axis\n *\n * @param {quat} out quat receiving operation result\n * @param {quat} a quat to rotate\n * @param {number} rad angle (in radians) to rotate\n * @returns {quat} out\n */\nfunction rotateY(out, a, rad) {\n  rad *= 0.5;\n\n  var ax = a[0],\n      ay = a[1],\n      az = a[2],\n      aw = a[3];\n  var by = Math.sin(rad),\n      bw = Math.cos(rad);\n\n  out[0] = ax * bw - az * by;\n  out[1] = ay * bw + aw * by;\n  out[2] = az * bw + ax * by;\n  out[3] = aw * bw - ay * by;\n  return out;\n}\n\n/**\n * Rotates a quaternion by the given angle about the Z axis\n *\n * @param {quat} out quat receiving operation result\n * @param {quat} a quat to rotate\n * @param {number} rad angle (in radians) to rotate\n * @returns {quat} out\n */\nfunction rotateZ(out, a, rad) {\n  rad *= 0.5;\n\n  var ax = a[0],\n      ay = a[1],\n      az = a[2],\n      aw = a[3];\n  var bz = Math.sin(rad),\n      bw = Math.cos(rad);\n\n  out[0] = ax * bw + ay * bz;\n  out[1] = ay * bw - ax * bz;\n  out[2] = az * bw + aw * bz;\n  out[3] = aw * bw - az * bz;\n  return out;\n}\n\n/**\n * Calculates the W component of a quat from the X, Y, and Z components.\n * Assumes that quaternion is 1 unit in length.\n * Any existing W component will be ignored.\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a quat to calculate W component of\n * @returns {quat} out\n */\nfunction calculateW(out, a) {\n  var x = a[0],\n      y = a[1],\n      z = a[2];\n\n  out[0] = x;\n  out[1] = y;\n  out[2] = z;\n  out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));\n  return out;\n}\n\n/**\n * Performs a spherical linear interpolation between two quat\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a the first operand\n * @param {quat} b the second operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {quat} out\n */\nfunction slerp(out, a, b, t) {\n  // benchmarks:\n  //    http://jsperf.com/quaternion-slerp-implementations\n  var ax = a[0],\n      ay = a[1],\n      az = a[2],\n      aw = a[3];\n  var bx = b[0],\n      by = b[1],\n      bz = b[2],\n      bw = b[3];\n\n  var omega = void 0,\n      cosom = void 0,\n      sinom = void 0,\n      scale0 = void 0,\n      scale1 = void 0;\n\n  // calc cosine\n  cosom = ax * bx + ay * by + az * bz + aw * bw;\n  // adjust signs (if necessary)\n  if (cosom < 0.0) {\n    cosom = -cosom;\n    bx = -bx;\n    by = -by;\n    bz = -bz;\n    bw = -bw;\n  }\n  // calculate coefficients\n  if (1.0 - cosom > 0.000001) {\n    // standard case (slerp)\n    omega = Math.acos(cosom);\n    sinom = Math.sin(omega);\n    scale0 = Math.sin((1.0 - t) * omega) / sinom;\n    scale1 = Math.sin(t * omega) / sinom;\n  } else {\n    // \"from\" and \"to\" quaternions are very close\n    //  ... so we can do a linear interpolation\n    scale0 = 1.0 - t;\n    scale1 = t;\n  }\n  // calculate final values\n  out[0] = scale0 * ax + scale1 * bx;\n  out[1] = scale0 * ay + scale1 * by;\n  out[2] = scale0 * az + scale1 * bz;\n  out[3] = scale0 * aw + scale1 * bw;\n\n  return out;\n}\n\n/**\n * Calculates the inverse of a quat\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a quat to calculate inverse of\n * @returns {quat} out\n */\nfunction invert(out, a) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n  var dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;\n  var invDot = dot ? 1.0 / dot : 0;\n\n  // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0\n\n  out[0] = -a0 * invDot;\n  out[1] = -a1 * invDot;\n  out[2] = -a2 * invDot;\n  out[3] = a3 * invDot;\n  return out;\n}\n\n/**\n * Calculates the conjugate of a quat\n * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a quat to calculate conjugate of\n * @returns {quat} out\n */\nfunction conjugate(out, a) {\n  out[0] = -a[0];\n  out[1] = -a[1];\n  out[2] = -a[2];\n  out[3] = a[3];\n  return out;\n}\n\n/**\n * Creates a quaternion from the given 3x3 rotation matrix.\n *\n * NOTE: The resultant quaternion is not normalized, so you should be sure\n * to renormalize the quaternion yourself where necessary.\n *\n * @param {quat} out the receiving quaternion\n * @param {mat3} m rotation matrix\n * @returns {quat} out\n * @function\n */\nfunction fromMat3(out, m) {\n  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes\n  // article \"Quaternion Calculus and Fast Animation\".\n  var fTrace = m[0] + m[4] + m[8];\n  var fRoot = void 0;\n\n  if (fTrace > 0.0) {\n    // |w| > 1/2, may as well choose w > 1/2\n    fRoot = Math.sqrt(fTrace + 1.0); // 2w\n    out[3] = 0.5 * fRoot;\n    fRoot = 0.5 / fRoot; // 1/(4w)\n    out[0] = (m[5] - m[7]) * fRoot;\n    out[1] = (m[6] - m[2]) * fRoot;\n    out[2] = (m[1] - m[3]) * fRoot;\n  } else {\n    // |w| <= 1/2\n    var i = 0;\n    if (m[4] > m[0]) i = 1;\n    if (m[8] > m[i * 3 + i]) i = 2;\n    var j = (i + 1) % 3;\n    var k = (i + 2) % 3;\n\n    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);\n    out[i] = 0.5 * fRoot;\n    fRoot = 0.5 / fRoot;\n    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;\n    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;\n    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;\n  }\n\n  return out;\n}\n\n/**\n * Creates a quaternion from the given euler angle x, y, z.\n *\n * @param {quat} out the receiving quaternion\n * @param {x} Angle to rotate around X axis in degrees.\n * @param {y} Angle to rotate around Y axis in degrees.\n * @param {z} Angle to rotate around Z axis in degrees.\n * @returns {quat} out\n * @function\n */\nfunction fromEuler(out, x, y, z) {\n  var halfToRad = 0.5 * Math.PI / 180.0;\n  x *= halfToRad;\n  y *= halfToRad;\n  z *= halfToRad;\n\n  var sx = Math.sin(x);\n  var cx = Math.cos(x);\n  var sy = Math.sin(y);\n  var cy = Math.cos(y);\n  var sz = Math.sin(z);\n  var cz = Math.cos(z);\n\n  out[0] = sx * cy * cz - cx * sy * sz;\n  out[1] = cx * sy * cz + sx * cy * sz;\n  out[2] = cx * cy * sz - sx * sy * cz;\n  out[3] = cx * cy * cz + sx * sy * sz;\n\n  return out;\n}\n\n/**\n * Returns a string representation of a quatenion\n *\n * @param {quat} a vector to represent as a string\n * @returns {String} string representation of the vector\n */\nfunction str(a) {\n  return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';\n}\n\n/**\n * Creates a new quat initialized with values from an existing quaternion\n *\n * @param {quat} a quaternion to clone\n * @returns {quat} a new quaternion\n * @function\n */\nvar clone = exports.clone = vec4.clone;\n\n/**\n * Creates a new quat initialized with the given values\n *\n * @param {Number} x X component\n * @param {Number} y Y component\n * @param {Number} z Z component\n * @param {Number} w W component\n * @returns {quat} a new quaternion\n * @function\n */\nvar fromValues = exports.fromValues = vec4.fromValues;\n\n/**\n * Copy the values from one quat to another\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a the source quaternion\n * @returns {quat} out\n * @function\n */\nvar copy = exports.copy = vec4.copy;\n\n/**\n * Set the components of a quat to the given values\n *\n * @param {quat} out the receiving quaternion\n * @param {Number} x X component\n * @param {Number} y Y component\n * @param {Number} z Z component\n * @param {Number} w W component\n * @returns {quat} out\n * @function\n */\nvar set = exports.set = vec4.set;\n\n/**\n * Adds two quat's\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a the first operand\n * @param {quat} b the second operand\n * @returns {quat} out\n * @function\n */\nvar add = exports.add = vec4.add;\n\n/**\n * Alias for {@link quat.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Scales a quat by a scalar number\n *\n * @param {quat} out the receiving vector\n * @param {quat} a the vector to scale\n * @param {Number} b amount to scale the vector by\n * @returns {quat} out\n * @function\n */\nvar scale = exports.scale = vec4.scale;\n\n/**\n * Calculates the dot product of two quat's\n *\n * @param {quat} a the first operand\n * @param {quat} b the second operand\n * @returns {Number} dot product of a and b\n * @function\n */\nvar dot = exports.dot = vec4.dot;\n\n/**\n * Performs a linear interpolation between two quat's\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a the first operand\n * @param {quat} b the second operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {quat} out\n * @function\n */\nvar lerp = exports.lerp = vec4.lerp;\n\n/**\n * Calculates the length of a quat\n *\n * @param {quat} a vector to calculate length of\n * @returns {Number} length of a\n */\nvar length = exports.length = vec4.length;\n\n/**\n * Alias for {@link quat.length}\n * @function\n */\nvar len = exports.len = length;\n\n/**\n * Calculates the squared length of a quat\n *\n * @param {quat} a vector to calculate squared length of\n * @returns {Number} squared length of a\n * @function\n */\nvar squaredLength = exports.squaredLength = vec4.squaredLength;\n\n/**\n * Alias for {@link quat.squaredLength}\n * @function\n */\nvar sqrLen = exports.sqrLen = squaredLength;\n\n/**\n * Normalize a quat\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a quaternion to normalize\n * @returns {quat} out\n * @function\n */\nvar normalize = exports.normalize = vec4.normalize;\n\n/**\n * Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)\n *\n * @param {quat} a The first quaternion.\n * @param {quat} b The second quaternion.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nvar exactEquals = exports.exactEquals = vec4.exactEquals;\n\n/**\n * Returns whether or not the quaternions have approximately the same elements in the same position.\n *\n * @param {quat} a The first vector.\n * @param {quat} b The second vector.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nvar equals = exports.equals = vec4.equals;\n\n/**\n * Sets a quaternion to represent the shortest rotation from one\n * vector to another.\n *\n * Both vectors are assumed to be unit length.\n *\n * @param {quat} out the receiving quaternion.\n * @param {vec3} a the initial vector\n * @param {vec3} b the destination vector\n * @returns {quat} out\n */\nvar rotationTo = exports.rotationTo = function () {\n  var tmpvec3 = vec3.create();\n  var xUnitVec3 = vec3.fromValues(1, 0, 0);\n  var yUnitVec3 = vec3.fromValues(0, 1, 0);\n\n  return function (out, a, b) {\n    var dot = vec3.dot(a, b);\n    if (dot < -0.999999) {\n      vec3.cross(tmpvec3, xUnitVec3, a);\n      if (vec3.len(tmpvec3) < 0.000001) vec3.cross(tmpvec3, yUnitVec3, a);\n      vec3.normalize(tmpvec3, tmpvec3);\n      setAxisAngle(out, tmpvec3, Math.PI);\n      return out;\n    } else if (dot > 0.999999) {\n      out[0] = 0;\n      out[1] = 0;\n      out[2] = 0;\n      out[3] = 1;\n      return out;\n    } else {\n      vec3.cross(tmpvec3, a, b);\n      out[0] = tmpvec3[0];\n      out[1] = tmpvec3[1];\n      out[2] = tmpvec3[2];\n      out[3] = 1 + dot;\n      return normalize(out, out);\n    }\n  };\n}();\n\n/**\n * Performs a spherical linear interpolation with two control points\n *\n * @param {quat} out the receiving quaternion\n * @param {quat} a the first operand\n * @param {quat} b the second operand\n * @param {quat} c the third operand\n * @param {quat} d the fourth operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {quat} out\n */\nvar sqlerp = exports.sqlerp = function () {\n  var temp1 = create();\n  var temp2 = create();\n\n  return function (out, a, b, c, d, t) {\n    slerp(temp1, a, d, t);\n    slerp(temp2, b, c, t);\n    slerp(out, temp1, temp2, 2 * t * (1 - t));\n\n    return out;\n  };\n}();\n\n/**\n * Sets the specified quaternion with values corresponding to the given\n * axes. Each axis is a vec3 and is expected to be unit length and\n * perpendicular to all other specified axes.\n *\n * @param {vec3} view  the vector representing the viewing direction\n * @param {vec3} right the vector representing the local \"right\" direction\n * @param {vec3} up    the vector representing the local \"up\" direction\n * @returns {quat} out\n */\nvar setAxes = exports.setAxes = function () {\n  var matr = mat3.create();\n\n  return function (out, view, right, up) {\n    matr[0] = right[0];\n    matr[3] = right[1];\n    matr[6] = right[2];\n\n    matr[1] = up[0];\n    matr[4] = up[1];\n    matr[7] = up[2];\n\n    matr[2] = -view[0];\n    matr[5] = -view[1];\n    matr[8] = -view[2];\n\n    return normalize(out, fromMat3(out, matr));\n  };\n}();\n\n//# sourceURL=webpack:///./src/gl-matrix/quat.js?");

/***/ }),

/***/ "./src/gl-matrix/quat2.js":
/*!********************************!*\
  !*** ./src/gl-matrix/quat2.js ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.sqrLen = exports.squaredLength = exports.len = exports.length = exports.dot = exports.mul = exports.setReal = exports.getReal = undefined;\nexports.create = create;\nexports.clone = clone;\nexports.fromValues = fromValues;\nexports.fromRotationTranslationValues = fromRotationTranslationValues;\nexports.fromRotationTranslation = fromRotationTranslation;\nexports.fromTranslation = fromTranslation;\nexports.fromRotation = fromRotation;\nexports.fromMat4 = fromMat4;\nexports.copy = copy;\nexports.identity = identity;\nexports.set = set;\nexports.getDual = getDual;\nexports.setDual = setDual;\nexports.getTranslation = getTranslation;\nexports.translate = translate;\nexports.rotateX = rotateX;\nexports.rotateY = rotateY;\nexports.rotateZ = rotateZ;\nexports.rotateByQuatAppend = rotateByQuatAppend;\nexports.rotateByQuatPrepend = rotateByQuatPrepend;\nexports.rotateAroundAxis = rotateAroundAxis;\nexports.add = add;\nexports.multiply = multiply;\nexports.scale = scale;\nexports.lerp = lerp;\nexports.invert = invert;\nexports.conjugate = conjugate;\nexports.normalize = normalize;\nexports.str = str;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nvar _quat = __webpack_require__(/*! ./quat.js */ \"./src/gl-matrix/quat.js\");\n\nvar quat = _interopRequireWildcard(_quat);\n\nvar _mat = __webpack_require__(/*! ./mat4.js */ \"./src/gl-matrix/mat4.js\");\n\nvar mat4 = _interopRequireWildcard(_mat);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * Dual Quaternion<br>\n * Format: [real, dual]<br>\n * Quaternion format: XYZW<br>\n * Make sure to have normalized dual quaternions, otherwise the functions may not work as intended.<br>\n * @module quat2\n */\n\n/**\n * Creates a new identity dual quat\n *\n * @returns {quat2} a new dual quaternion [real -> rotation, dual -> translation]\n */\nfunction create() {\n  var dq = new glMatrix.ARRAY_TYPE(8);\n  dq[0] = 0;\n  dq[1] = 0;\n  dq[2] = 0;\n  dq[3] = 1;\n  dq[4] = 0;\n  dq[5] = 0;\n  dq[6] = 0;\n  dq[7] = 0;\n  return dq;\n}\n\n/**\n * Creates a new quat initialized with values from an existing quaternion\n *\n * @param {quat2} a dual quaternion to clone\n * @returns {quat2} new dual quaternion\n * @function\n */\nfunction clone(a) {\n  var dq = new glMatrix.ARRAY_TYPE(8);\n  dq[0] = a[0];\n  dq[1] = a[1];\n  dq[2] = a[2];\n  dq[3] = a[3];\n  dq[4] = a[4];\n  dq[5] = a[5];\n  dq[6] = a[6];\n  dq[7] = a[7];\n  return dq;\n}\n\n/**\n * Creates a new dual quat initialized with the given values\n *\n * @param {Number} x1 X component\n * @param {Number} y1 Y component\n * @param {Number} z1 Z component\n * @param {Number} w1 W component\n * @param {Number} x2 X component\n * @param {Number} y2 Y component\n * @param {Number} z2 Z component\n * @param {Number} w2 W component\n * @returns {quat2} new dual quaternion\n * @function\n */\nfunction fromValues(x1, y1, z1, w1, x2, y2, z2, w2) {\n  var dq = new glMatrix.ARRAY_TYPE(8);\n  dq[0] = x1;\n  dq[1] = y1;\n  dq[2] = z1;\n  dq[3] = w1;\n  dq[4] = x2;\n  dq[5] = y2;\n  dq[6] = z2;\n  dq[7] = w2;\n  return dq;\n}\n\n/**\n * Creates a new dual quat from the given values (quat and translation)\n *\n * @param {Number} x1 X component\n * @param {Number} y1 Y component\n * @param {Number} z1 Z component\n * @param {Number} w1 W component\n * @param {Number} x2 X component (translation)\n * @param {Number} y2 Y component (translation)\n * @param {Number} z2 Z component (translation)\n * @returns {quat2} new dual quaternion\n * @function\n */\nfunction fromRotationTranslationValues(x1, y1, z1, w1, x2, y2, z2) {\n  var dq = new glMatrix.ARRAY_TYPE(8);\n  dq[0] = x1;\n  dq[1] = y1;\n  dq[2] = z1;\n  dq[3] = w1;\n  var ax = x2 * 0.5,\n      ay = y2 * 0.5,\n      az = z2 * 0.5;\n  dq[4] = ax * w1 + ay * z1 - az * y1;\n  dq[5] = ay * w1 + az * x1 - ax * z1;\n  dq[6] = az * w1 + ax * y1 - ay * x1;\n  dq[7] = -ax * x1 - ay * y1 - az * z1;\n  return dq;\n}\n\n/**\n * Creates a dual quat from a quaternion and a translation\n *\n * @param {quat2} dual quaternion receiving operation result\n * @param {quat} q quaternion\n * @param {vec3} t tranlation vector\n * @returns {quat2} dual quaternion receiving operation result\n * @function\n */\nfunction fromRotationTranslation(out, q, t) {\n  var ax = t[0] * 0.5,\n      ay = t[1] * 0.5,\n      az = t[2] * 0.5,\n      bx = q[0],\n      by = q[1],\n      bz = q[2],\n      bw = q[3];\n  out[0] = bx;\n  out[1] = by;\n  out[2] = bz;\n  out[3] = bw;\n  out[4] = ax * bw + ay * bz - az * by;\n  out[5] = ay * bw + az * bx - ax * bz;\n  out[6] = az * bw + ax * by - ay * bx;\n  out[7] = -ax * bx - ay * by - az * bz;\n  return out;\n}\n\n/**\n * Creates a dual quat from a translation\n *\n * @param {quat2} dual quaternion receiving operation result\n * @param {vec3} t translation vector\n * @returns {quat2} dual quaternion receiving operation result\n * @function\n */\nfunction fromTranslation(out, t) {\n  out[0] = 0;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  out[4] = t[0] * 0.5;\n  out[5] = t[1] * 0.5;\n  out[6] = t[2] * 0.5;\n  out[7] = 0;\n  return out;\n}\n\n/**\n * Creates a dual quat from a quaternion\n *\n * @param {quat2} dual quaternion receiving operation result\n * @param {quat} q the quaternion\n * @returns {quat2} dual quaternion receiving operation result\n * @function\n */\nfunction fromRotation(out, q) {\n  out[0] = q[0];\n  out[1] = q[1];\n  out[2] = q[2];\n  out[3] = q[3];\n  out[4] = 0;\n  out[5] = 0;\n  out[6] = 0;\n  out[7] = 0;\n  return out;\n}\n\n/**\n * Creates a new dual quat from a matrix (4x4)\n *\n * @param {quat2} out the dual quaternion\n * @param {mat4} a the matrix\n * @returns {quat2} dual quat receiving operation result\n * @function\n */\nfunction fromMat4(out, a) {\n  //TODO Optimize this\n  var outer = quat.create();\n  mat4.getRotation(outer, a);\n  var t = new glMatrix.ARRAY_TYPE(3);\n  mat4.getTranslation(t, a);\n  fromRotationTranslation(out, outer, t);\n  return out;\n}\n\n/**\n * Copy the values from one dual quat to another\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the source dual quaternion\n * @returns {quat2} out\n * @function\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  out[4] = a[4];\n  out[5] = a[5];\n  out[6] = a[6];\n  out[7] = a[7];\n  return out;\n}\n\n/**\n * Set a dual quat to the identity dual quaternion\n *\n * @param {quat2} out the receiving quaternion\n * @returns {quat2} out\n */\nfunction identity(out) {\n  out[0] = 0;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 1;\n  out[4] = 0;\n  out[5] = 0;\n  out[6] = 0;\n  out[7] = 0;\n  return out;\n}\n\n/**\n * Set the components of a dual quat to the given values\n *\n * @param {quat2} out the receiving quaternion\n * @param {Number} x1 X component\n * @param {Number} y1 Y component\n * @param {Number} z1 Z component\n * @param {Number} w1 W component\n * @param {Number} x2 X component\n * @param {Number} y2 Y component\n * @param {Number} z2 Z component\n * @param {Number} w2 W component\n * @returns {quat2} out\n * @function\n */\nfunction set(out, x1, y1, z1, w1, x2, y2, z2, w2) {\n  out[0] = x1;\n  out[1] = y1;\n  out[2] = z1;\n  out[3] = w1;\n\n  out[4] = x2;\n  out[5] = y2;\n  out[6] = z2;\n  out[7] = w2;\n  return out;\n}\n\n/**\n * Gets the real part of a dual quat\n * @param  {quat} out real part\n * @param  {quat2} a Dual Quaternion\n * @return {quat} real part\n */\nvar getReal = exports.getReal = quat.copy;\n\n/**\n * Gets the dual part of a dual quat\n * @param  {quat} out dual part\n * @param  {quat2} a Dual Quaternion\n * @return {quat} dual part\n */\nfunction getDual(out, a) {\n  out[0] = a[4];\n  out[1] = a[5];\n  out[2] = a[6];\n  out[3] = a[7];\n  return out;\n}\n\n/**\n * Set the real component of a dual quat to the given quaternion\n *\n * @param {quat2} out the receiving quaternion\n * @param {quat} q a quaternion representing the real part\n * @returns {quat2} out\n * @function\n */\nvar setReal = exports.setReal = quat.copy;\n\n/**\n * Set the dual component of a dual quat to the given quaternion\n *\n * @param {quat2} out the receiving quaternion\n * @param {quat} q a quaternion representing the dual part\n * @returns {quat2} out\n * @function\n */\nfunction setDual(out, q) {\n  out[4] = q[0];\n  out[5] = q[1];\n  out[6] = q[2];\n  out[7] = q[3];\n  return out;\n}\n\n/**\n * Gets the translation of a normalized dual quat\n * @param  {vec3} out translation\n * @param  {quat2} a Dual Quaternion to be decomposed\n * @return {vec3} translation\n */\nfunction getTranslation(out, a) {\n  var ax = a[4],\n      ay = a[5],\n      az = a[6],\n      aw = a[7],\n      bx = -a[0],\n      by = -a[1],\n      bz = -a[2],\n      bw = a[3];\n  out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;\n  out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;\n  out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;\n  return out;\n}\n\n/**\n * Translates a dual quat by the given vector\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the dual quaternion to translate\n * @param {vec3} v vector to translate by\n * @returns {quat2} out\n */\nfunction translate(out, a, v) {\n  var ax1 = a[0],\n      ay1 = a[1],\n      az1 = a[2],\n      aw1 = a[3],\n      bx1 = v[0] * 0.5,\n      by1 = v[1] * 0.5,\n      bz1 = v[2] * 0.5,\n      ax2 = a[4],\n      ay2 = a[5],\n      az2 = a[6],\n      aw2 = a[7];\n  out[0] = ax1;\n  out[1] = ay1;\n  out[2] = az1;\n  out[3] = aw1;\n  out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;\n  out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;\n  out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;\n  out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;\n  return out;\n}\n\n/**\n * Rotates a dual quat around the X axis\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the dual quaternion to rotate\n * @param {number} rad how far should the rotation be\n * @returns {quat2} out\n */\nfunction rotateX(out, a, rad) {\n  var bx = -a[0],\n      by = -a[1],\n      bz = -a[2],\n      bw = a[3],\n      ax = a[4],\n      ay = a[5],\n      az = a[6],\n      aw = a[7],\n      ax1 = ax * bw + aw * bx + ay * bz - az * by,\n      ay1 = ay * bw + aw * by + az * bx - ax * bz,\n      az1 = az * bw + aw * bz + ax * by - ay * bx,\n      aw1 = aw * bw - ax * bx - ay * by - az * bz;\n  quat.rotateX(out, a, rad);\n  bx = out[0];\n  by = out[1];\n  bz = out[2];\n  bw = out[3];\n  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;\n  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;\n  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;\n  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;\n  return out;\n}\n\n/**\n * Rotates a dual quat around the Y axis\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the dual quaternion to rotate\n * @param {number} rad how far should the rotation be\n * @returns {quat2} out\n */\nfunction rotateY(out, a, rad) {\n  var bx = -a[0],\n      by = -a[1],\n      bz = -a[2],\n      bw = a[3],\n      ax = a[4],\n      ay = a[5],\n      az = a[6],\n      aw = a[7],\n      ax1 = ax * bw + aw * bx + ay * bz - az * by,\n      ay1 = ay * bw + aw * by + az * bx - ax * bz,\n      az1 = az * bw + aw * bz + ax * by - ay * bx,\n      aw1 = aw * bw - ax * bx - ay * by - az * bz;\n  quat.rotateY(out, a, rad);\n  bx = out[0];\n  by = out[1];\n  bz = out[2];\n  bw = out[3];\n  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;\n  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;\n  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;\n  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;\n  return out;\n}\n\n/**\n * Rotates a dual quat around the Z axis\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the dual quaternion to rotate\n * @param {number} rad how far should the rotation be\n * @returns {quat2} out\n */\nfunction rotateZ(out, a, rad) {\n  var bx = -a[0],\n      by = -a[1],\n      bz = -a[2],\n      bw = a[3],\n      ax = a[4],\n      ay = a[5],\n      az = a[6],\n      aw = a[7],\n      ax1 = ax * bw + aw * bx + ay * bz - az * by,\n      ay1 = ay * bw + aw * by + az * bx - ax * bz,\n      az1 = az * bw + aw * bz + ax * by - ay * bx,\n      aw1 = aw * bw - ax * bx - ay * by - az * bz;\n  quat.rotateZ(out, a, rad);\n  bx = out[0];\n  by = out[1];\n  bz = out[2];\n  bw = out[3];\n  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;\n  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;\n  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;\n  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;\n  return out;\n}\n\n/**\n * Rotates a dual quat by a given quaternion (a * q)\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the dual quaternion to rotate\n * @param {quat} q quaternion to rotate by\n * @returns {quat2} out\n */\nfunction rotateByQuatAppend(out, a, q) {\n  var qx = q[0],\n      qy = q[1],\n      qz = q[2],\n      qw = q[3],\n      ax = a[0],\n      ay = a[1],\n      az = a[2],\n      aw = a[3];\n\n  out[0] = ax * qw + aw * qx + ay * qz - az * qy;\n  out[1] = ay * qw + aw * qy + az * qx - ax * qz;\n  out[2] = az * qw + aw * qz + ax * qy - ay * qx;\n  out[3] = aw * qw - ax * qx - ay * qy - az * qz;\n  ax = a[4];\n  ay = a[5];\n  az = a[6];\n  aw = a[7];\n  out[4] = ax * qw + aw * qx + ay * qz - az * qy;\n  out[5] = ay * qw + aw * qy + az * qx - ax * qz;\n  out[6] = az * qw + aw * qz + ax * qy - ay * qx;\n  out[7] = aw * qw - ax * qx - ay * qy - az * qz;\n  return out;\n}\n\n/**\n * Rotates a dual quat by a given quaternion (q * a)\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat} q quaternion to rotate by\n * @param {quat2} a the dual quaternion to rotate\n * @returns {quat2} out\n */\nfunction rotateByQuatPrepend(out, q, a) {\n  var qx = q[0],\n      qy = q[1],\n      qz = q[2],\n      qw = q[3],\n      bx = a[0],\n      by = a[1],\n      bz = a[2],\n      bw = a[3];\n\n  out[0] = qx * bw + qw * bx + qy * bz - qz * by;\n  out[1] = qy * bw + qw * by + qz * bx - qx * bz;\n  out[2] = qz * bw + qw * bz + qx * by - qy * bx;\n  out[3] = qw * bw - qx * bx - qy * by - qz * bz;\n  bx = a[4];\n  by = a[5];\n  bz = a[6];\n  bw = a[7];\n  out[4] = qx * bw + qw * bx + qy * bz - qz * by;\n  out[5] = qy * bw + qw * by + qz * bx - qx * bz;\n  out[6] = qz * bw + qw * bz + qx * by - qy * bx;\n  out[7] = qw * bw - qx * bx - qy * by - qz * bz;\n  return out;\n}\n\n/**\n * Rotates a dual quat around a given axis. Does the normalisation automatically\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the dual quaternion to rotate\n * @param {vec3} axis the axis to rotate around\n * @param {Number} rad how far the rotation should be\n * @returns {quat2} out\n */\nfunction rotateAroundAxis(out, a, axis, rad) {\n  //Special case for rad = 0\n  if (Math.abs(rad) < glMatrix.EPSILON) {\n    return copy(out, a);\n  }\n  var axisLength = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);\n\n  rad = rad * 0.5;\n  var s = Math.sin(rad);\n  var bx = s * axis[0] / axisLength;\n  var by = s * axis[1] / axisLength;\n  var bz = s * axis[2] / axisLength;\n  var bw = Math.cos(rad);\n\n  var ax1 = a[0],\n      ay1 = a[1],\n      az1 = a[2],\n      aw1 = a[3];\n  out[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;\n  out[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;\n  out[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;\n  out[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;\n\n  var ax = a[4],\n      ay = a[5],\n      az = a[6],\n      aw = a[7];\n  out[4] = ax * bw + aw * bx + ay * bz - az * by;\n  out[5] = ay * bw + aw * by + az * bx - ax * bz;\n  out[6] = az * bw + aw * bz + ax * by - ay * bx;\n  out[7] = aw * bw - ax * bx - ay * by - az * bz;\n\n  return out;\n}\n\n/**\n * Adds two dual quat's\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the first operand\n * @param {quat2} b the second operand\n * @returns {quat2} out\n * @function\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  out[2] = a[2] + b[2];\n  out[3] = a[3] + b[3];\n  out[4] = a[4] + b[4];\n  out[5] = a[5] + b[5];\n  out[6] = a[6] + b[6];\n  out[7] = a[7] + b[7];\n  return out;\n}\n\n/**\n * Multiplies two dual quat's\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a the first operand\n * @param {quat2} b the second operand\n * @returns {quat2} out\n */\nfunction multiply(out, a, b) {\n  var ax0 = a[0],\n      ay0 = a[1],\n      az0 = a[2],\n      aw0 = a[3],\n      bx1 = b[4],\n      by1 = b[5],\n      bz1 = b[6],\n      bw1 = b[7],\n      ax1 = a[4],\n      ay1 = a[5],\n      az1 = a[6],\n      aw1 = a[7],\n      bx0 = b[0],\n      by0 = b[1],\n      bz0 = b[2],\n      bw0 = b[3];\n  out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;\n  out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;\n  out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;\n  out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;\n  out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;\n  out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;\n  out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;\n  out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;\n  return out;\n}\n\n/**\n * Alias for {@link quat2.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Scales a dual quat by a scalar number\n *\n * @param {quat2} out the receiving dual quat\n * @param {quat2} a the dual quat to scale\n * @param {Number} b amount to scale the dual quat by\n * @returns {quat2} out\n * @function\n */\nfunction scale(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  out[2] = a[2] * b;\n  out[3] = a[3] * b;\n  out[4] = a[4] * b;\n  out[5] = a[5] * b;\n  out[6] = a[6] * b;\n  out[7] = a[7] * b;\n  return out;\n}\n\n/**\n * Calculates the dot product of two dual quat's (The dot product of the real parts)\n *\n * @param {quat2} a the first operand\n * @param {quat2} b the second operand\n * @returns {Number} dot product of a and b\n * @function\n */\nvar dot = exports.dot = quat.dot;\n\n/**\n * Performs a linear interpolation between two dual quats's\n * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)\n *\n * @param {quat2} out the receiving dual quat\n * @param {quat2} a the first operand\n * @param {quat2} b the second operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {quat2} out\n */\nfunction lerp(out, a, b, t) {\n  var mt = 1 - t;\n  if (dot(a, b) < 0) t = -t;\n\n  out[0] = a[0] * mt + b[0] * t;\n  out[1] = a[1] * mt + b[1] * t;\n  out[2] = a[2] * mt + b[2] * t;\n  out[3] = a[3] * mt + b[3] * t;\n  out[4] = a[4] * mt + b[4] * t;\n  out[5] = a[5] * mt + b[5] * t;\n  out[6] = a[6] * mt + b[6] * t;\n  out[7] = a[7] * mt + b[7] * t;\n\n  return out;\n}\n\n/**\n * Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a dual quat to calculate inverse of\n * @returns {quat2} out\n */\nfunction invert(out, a) {\n  var sqlen = squaredLength(a);\n  out[0] = -a[0] / sqlen;\n  out[1] = -a[1] / sqlen;\n  out[2] = -a[2] / sqlen;\n  out[3] = a[3] / sqlen;\n  out[4] = -a[4] / sqlen;\n  out[5] = -a[5] / sqlen;\n  out[6] = -a[6] / sqlen;\n  out[7] = a[7] / sqlen;\n  return out;\n}\n\n/**\n * Calculates the conjugate of a dual quat\n * If the dual quaternion is normalized, this function is faster than quat2.inverse and produces the same result.\n *\n * @param {quat2} out the receiving quaternion\n * @param {quat2} a quat to calculate conjugate of\n * @returns {quat2} out\n */\nfunction conjugate(out, a) {\n  out[0] = -a[0];\n  out[1] = -a[1];\n  out[2] = -a[2];\n  out[3] = a[3];\n  out[4] = -a[4];\n  out[5] = -a[5];\n  out[6] = -a[6];\n  out[7] = a[7];\n  return out;\n}\n\n/**\n * Calculates the length of a dual quat\n *\n * @param {quat2} a dual quat to calculate length of\n * @returns {Number} length of a\n * @function\n */\nvar length = exports.length = quat.length;\n\n/**\n * Alias for {@link quat2.length}\n * @function\n */\nvar len = exports.len = length;\n\n/**\n * Calculates the squared length of a dual quat\n *\n * @param {quat2} a dual quat to calculate squared length of\n * @returns {Number} squared length of a\n * @function\n */\nvar squaredLength = exports.squaredLength = quat.squaredLength;\n\n/**\n * Alias for {@link quat2.squaredLength}\n * @function\n */\nvar sqrLen = exports.sqrLen = squaredLength;\n\n/**\n * Normalize a dual quat\n *\n * @param {quat2} out the receiving dual quaternion\n * @param {quat2} a dual quaternion to normalize\n * @returns {quat2} out\n * @function\n */\nfunction normalize(out, a) {\n  var magnitude = squaredLength(a);\n  if (magnitude > 0) {\n    magnitude = Math.sqrt(magnitude);\n    out[0] = a[0] / magnitude;\n    out[1] = a[1] / magnitude;\n    out[2] = a[2] / magnitude;\n    out[3] = a[3] / magnitude;\n    out[4] = a[4] / magnitude;\n    out[5] = a[5] / magnitude;\n    out[6] = a[6] / magnitude;\n    out[7] = a[7] / magnitude;\n  }\n  return out;\n}\n\n/**\n * Returns a string representation of a dual quatenion\n *\n * @param {quat2} a dual quaternion to represent as a string\n * @returns {String} string representation of the dual quat\n */\nfunction str(a) {\n  return 'quat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ')';\n}\n\n/**\n * Returns whether or not the dual quaternions have exactly the same elements in the same position (when compared with ===)\n *\n * @param {quat2} a the first dual quaternion.\n * @param {quat2} b the second dual quaternion.\n * @returns {Boolean} true if the dual quaternions are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7];\n}\n\n/**\n * Returns whether or not the dual quaternions have approximately the same elements in the same position.\n *\n * @param {quat2} a the first dual quat.\n * @param {quat2} b the second dual quat.\n * @returns {Boolean} true if the dual quats are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3],\n      a4 = a[4],\n      a5 = a[5],\n      a6 = a[6],\n      a7 = a[7];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3],\n      b4 = b[4],\n      b5 = b[5],\n      b6 = b[6],\n      b7 = b[7];\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7));\n}\n\n//# sourceURL=webpack:///./src/gl-matrix/quat2.js?");

/***/ }),

/***/ "./src/gl-matrix/vec2.js":
/*!*******************************!*\
  !*** ./src/gl-matrix/vec2.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.forEach = exports.sqrLen = exports.sqrDist = exports.dist = exports.div = exports.mul = exports.sub = exports.len = undefined;\nexports.create = create;\nexports.clone = clone;\nexports.fromValues = fromValues;\nexports.copy = copy;\nexports.set = set;\nexports.add = add;\nexports.subtract = subtract;\nexports.multiply = multiply;\nexports.divide = divide;\nexports.ceil = ceil;\nexports.floor = floor;\nexports.min = min;\nexports.max = max;\nexports.round = round;\nexports.scale = scale;\nexports.scaleAndAdd = scaleAndAdd;\nexports.distance = distance;\nexports.squaredDistance = squaredDistance;\nexports.length = length;\nexports.squaredLength = squaredLength;\nexports.negate = negate;\nexports.inverse = inverse;\nexports.normalize = normalize;\nexports.dot = dot;\nexports.cross = cross;\nexports.lerp = lerp;\nexports.random = random;\nexports.transformMat2 = transformMat2;\nexports.transformMat2d = transformMat2d;\nexports.transformMat3 = transformMat3;\nexports.transformMat4 = transformMat4;\nexports.rotate = rotate;\nexports.angle = angle;\nexports.str = str;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * 2 Dimensional Vector\n * @module vec2\n */\n\n/**\n * Creates a new, empty vec2\n *\n * @returns {vec2} a new 2D vector\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(2);\n  out[0] = 0;\n  out[1] = 0;\n  return out;\n}\n\n/**\n * Creates a new vec2 initialized with values from an existing vector\n *\n * @param {vec2} a vector to clone\n * @returns {vec2} a new 2D vector\n */\nfunction clone(a) {\n  var out = new glMatrix.ARRAY_TYPE(2);\n  out[0] = a[0];\n  out[1] = a[1];\n  return out;\n}\n\n/**\n * Creates a new vec2 initialized with the given values\n *\n * @param {Number} x X component\n * @param {Number} y Y component\n * @returns {vec2} a new 2D vector\n */\nfunction fromValues(x, y) {\n  var out = new glMatrix.ARRAY_TYPE(2);\n  out[0] = x;\n  out[1] = y;\n  return out;\n}\n\n/**\n * Copy the values from one vec2 to another\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the source vector\n * @returns {vec2} out\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  return out;\n}\n\n/**\n * Set the components of a vec2 to the given values\n *\n * @param {vec2} out the receiving vector\n * @param {Number} x X component\n * @param {Number} y Y component\n * @returns {vec2} out\n */\nfunction set(out, x, y) {\n  out[0] = x;\n  out[1] = y;\n  return out;\n}\n\n/**\n * Adds two vec2's\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {vec2} out\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  return out;\n}\n\n/**\n * Subtracts vector b from vector a\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {vec2} out\n */\nfunction subtract(out, a, b) {\n  out[0] = a[0] - b[0];\n  out[1] = a[1] - b[1];\n  return out;\n}\n\n/**\n * Multiplies two vec2's\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {vec2} out\n */\nfunction multiply(out, a, b) {\n  out[0] = a[0] * b[0];\n  out[1] = a[1] * b[1];\n  return out;\n}\n\n/**\n * Divides two vec2's\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {vec2} out\n */\nfunction divide(out, a, b) {\n  out[0] = a[0] / b[0];\n  out[1] = a[1] / b[1];\n  return out;\n}\n\n/**\n * Math.ceil the components of a vec2\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a vector to ceil\n * @returns {vec2} out\n */\nfunction ceil(out, a) {\n  out[0] = Math.ceil(a[0]);\n  out[1] = Math.ceil(a[1]);\n  return out;\n}\n\n/**\n * Math.floor the components of a vec2\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a vector to floor\n * @returns {vec2} out\n */\nfunction floor(out, a) {\n  out[0] = Math.floor(a[0]);\n  out[1] = Math.floor(a[1]);\n  return out;\n}\n\n/**\n * Returns the minimum of two vec2's\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {vec2} out\n */\nfunction min(out, a, b) {\n  out[0] = Math.min(a[0], b[0]);\n  out[1] = Math.min(a[1], b[1]);\n  return out;\n}\n\n/**\n * Returns the maximum of two vec2's\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {vec2} out\n */\nfunction max(out, a, b) {\n  out[0] = Math.max(a[0], b[0]);\n  out[1] = Math.max(a[1], b[1]);\n  return out;\n}\n\n/**\n * Math.round the components of a vec2\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a vector to round\n * @returns {vec2} out\n */\nfunction round(out, a) {\n  out[0] = Math.round(a[0]);\n  out[1] = Math.round(a[1]);\n  return out;\n}\n\n/**\n * Scales a vec2 by a scalar number\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the vector to scale\n * @param {Number} b amount to scale the vector by\n * @returns {vec2} out\n */\nfunction scale(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  return out;\n}\n\n/**\n * Adds two vec2's after scaling the second operand by a scalar value\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @param {Number} scale the amount to scale b by before adding\n * @returns {vec2} out\n */\nfunction scaleAndAdd(out, a, b, scale) {\n  out[0] = a[0] + b[0] * scale;\n  out[1] = a[1] + b[1] * scale;\n  return out;\n}\n\n/**\n * Calculates the euclidian distance between two vec2's\n *\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {Number} distance between a and b\n */\nfunction distance(a, b) {\n  var x = b[0] - a[0],\n      y = b[1] - a[1];\n  return Math.sqrt(x * x + y * y);\n}\n\n/**\n * Calculates the squared euclidian distance between two vec2's\n *\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {Number} squared distance between a and b\n */\nfunction squaredDistance(a, b) {\n  var x = b[0] - a[0],\n      y = b[1] - a[1];\n  return x * x + y * y;\n}\n\n/**\n * Calculates the length of a vec2\n *\n * @param {vec2} a vector to calculate length of\n * @returns {Number} length of a\n */\nfunction length(a) {\n  var x = a[0],\n      y = a[1];\n  return Math.sqrt(x * x + y * y);\n}\n\n/**\n * Calculates the squared length of a vec2\n *\n * @param {vec2} a vector to calculate squared length of\n * @returns {Number} squared length of a\n */\nfunction squaredLength(a) {\n  var x = a[0],\n      y = a[1];\n  return x * x + y * y;\n}\n\n/**\n * Negates the components of a vec2\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a vector to negate\n * @returns {vec2} out\n */\nfunction negate(out, a) {\n  out[0] = -a[0];\n  out[1] = -a[1];\n  return out;\n}\n\n/**\n * Returns the inverse of the components of a vec2\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a vector to invert\n * @returns {vec2} out\n */\nfunction inverse(out, a) {\n  out[0] = 1.0 / a[0];\n  out[1] = 1.0 / a[1];\n  return out;\n}\n\n/**\n * Normalize a vec2\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a vector to normalize\n * @returns {vec2} out\n */\nfunction normalize(out, a) {\n  var x = a[0],\n      y = a[1];\n  var len = x * x + y * y;\n  if (len > 0) {\n    //TODO: evaluate use of glm_invsqrt here?\n    len = 1 / Math.sqrt(len);\n    out[0] = a[0] * len;\n    out[1] = a[1] * len;\n  }\n  return out;\n}\n\n/**\n * Calculates the dot product of two vec2's\n *\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {Number} dot product of a and b\n */\nfunction dot(a, b) {\n  return a[0] * b[0] + a[1] * b[1];\n}\n\n/**\n * Computes the cross product of two vec2's\n * Note that the cross product must by definition produce a 3D vector\n *\n * @param {vec3} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @returns {vec3} out\n */\nfunction cross(out, a, b) {\n  var z = a[0] * b[1] - a[1] * b[0];\n  out[0] = out[1] = 0;\n  out[2] = z;\n  return out;\n}\n\n/**\n * Performs a linear interpolation between two vec2's\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the first operand\n * @param {vec2} b the second operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {vec2} out\n */\nfunction lerp(out, a, b, t) {\n  var ax = a[0],\n      ay = a[1];\n  out[0] = ax + t * (b[0] - ax);\n  out[1] = ay + t * (b[1] - ay);\n  return out;\n}\n\n/**\n * Generates a random vector with the given scale\n *\n * @param {vec2} out the receiving vector\n * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned\n * @returns {vec2} out\n */\nfunction random(out, scale) {\n  scale = scale || 1.0;\n  var r = glMatrix.RANDOM() * 2.0 * Math.PI;\n  out[0] = Math.cos(r) * scale;\n  out[1] = Math.sin(r) * scale;\n  return out;\n}\n\n/**\n * Transforms the vec2 with a mat2\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the vector to transform\n * @param {mat2} m matrix to transform with\n * @returns {vec2} out\n */\nfunction transformMat2(out, a, m) {\n  var x = a[0],\n      y = a[1];\n  out[0] = m[0] * x + m[2] * y;\n  out[1] = m[1] * x + m[3] * y;\n  return out;\n}\n\n/**\n * Transforms the vec2 with a mat2d\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the vector to transform\n * @param {mat2d} m matrix to transform with\n * @returns {vec2} out\n */\nfunction transformMat2d(out, a, m) {\n  var x = a[0],\n      y = a[1];\n  out[0] = m[0] * x + m[2] * y + m[4];\n  out[1] = m[1] * x + m[3] * y + m[5];\n  return out;\n}\n\n/**\n * Transforms the vec2 with a mat3\n * 3rd vector component is implicitly '1'\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the vector to transform\n * @param {mat3} m matrix to transform with\n * @returns {vec2} out\n */\nfunction transformMat3(out, a, m) {\n  var x = a[0],\n      y = a[1];\n  out[0] = m[0] * x + m[3] * y + m[6];\n  out[1] = m[1] * x + m[4] * y + m[7];\n  return out;\n}\n\n/**\n * Transforms the vec2 with a mat4\n * 3rd vector component is implicitly '0'\n * 4th vector component is implicitly '1'\n *\n * @param {vec2} out the receiving vector\n * @param {vec2} a the vector to transform\n * @param {mat4} m matrix to transform with\n * @returns {vec2} out\n */\nfunction transformMat4(out, a, m) {\n  var x = a[0];\n  var y = a[1];\n  out[0] = m[0] * x + m[4] * y + m[12];\n  out[1] = m[1] * x + m[5] * y + m[13];\n  return out;\n}\n\n/**\n * Rotate a 2D vector\n * @param {vec2} out The receiving vec2\n * @param {vec2} a The vec2 point to rotate\n * @param {vec2} b The origin of the rotation\n * @param {Number} c The angle of rotation\n * @returns {vec2} out\n */\nfunction rotate(out, a, b, c) {\n  //Translate point to the origin\n  var p0 = a[0] - b[0],\n      p1 = a[1] - b[1],\n      sinC = Math.sin(c),\n      cosC = Math.cos(c);\n\n  //perform rotation and translate to correct position\n  out[0] = p0 * cosC - p1 * sinC + b[0];\n  out[1] = p0 * sinC + p1 * cosC + b[1];\n\n  return out;\n}\n\n/**\n * Get the angle between two 2D vectors\n * @param {vec2} a The first operand\n * @param {vec2} b The second operand\n * @returns {Number} The angle in radians\n */\nfunction angle(a, b) {\n  var x1 = a[0],\n      y1 = a[1],\n      x2 = b[0],\n      y2 = b[1];\n\n  var len1 = x1 * x1 + y1 * y1;\n  if (len1 > 0) {\n    //TODO: evaluate use of glm_invsqrt here?\n    len1 = 1 / Math.sqrt(len1);\n  }\n\n  var len2 = x2 * x2 + y2 * y2;\n  if (len2 > 0) {\n    //TODO: evaluate use of glm_invsqrt here?\n    len2 = 1 / Math.sqrt(len2);\n  }\n\n  var cosine = (x1 * x2 + y1 * y2) * len1 * len2;\n\n  if (cosine > 1.0) {\n    return 0;\n  } else if (cosine < -1.0) {\n    return Math.PI;\n  } else {\n    return Math.acos(cosine);\n  }\n}\n\n/**\n * Returns a string representation of a vector\n *\n * @param {vec2} a vector to represent as a string\n * @returns {String} string representation of the vector\n */\nfunction str(a) {\n  return 'vec2(' + a[0] + ', ' + a[1] + ')';\n}\n\n/**\n * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)\n *\n * @param {vec2} a The first vector.\n * @param {vec2} b The second vector.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1];\n}\n\n/**\n * Returns whether or not the vectors have approximately the same elements in the same position.\n *\n * @param {vec2} a The first vector.\n * @param {vec2} b The second vector.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1];\n  var b0 = b[0],\n      b1 = b[1];\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1));\n}\n\n/**\n * Alias for {@link vec2.length}\n * @function\n */\nvar len = exports.len = length;\n\n/**\n * Alias for {@link vec2.subtract}\n * @function\n */\nvar sub = exports.sub = subtract;\n\n/**\n * Alias for {@link vec2.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Alias for {@link vec2.divide}\n * @function\n */\nvar div = exports.div = divide;\n\n/**\n * Alias for {@link vec2.distance}\n * @function\n */\nvar dist = exports.dist = distance;\n\n/**\n * Alias for {@link vec2.squaredDistance}\n * @function\n */\nvar sqrDist = exports.sqrDist = squaredDistance;\n\n/**\n * Alias for {@link vec2.squaredLength}\n * @function\n */\nvar sqrLen = exports.sqrLen = squaredLength;\n\n/**\n * Perform some operation over an array of vec2s.\n *\n * @param {Array} a the array of vectors to iterate over\n * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed\n * @param {Number} offset Number of elements to skip at the beginning of the array\n * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array\n * @param {Function} fn Function to call for each vector in the array\n * @param {Object} [arg] additional argument to pass to fn\n * @returns {Array} a\n * @function\n */\nvar forEach = exports.forEach = function () {\n  var vec = create();\n\n  return function (a, stride, offset, count, fn, arg) {\n    var i = void 0,\n        l = void 0;\n    if (!stride) {\n      stride = 2;\n    }\n\n    if (!offset) {\n      offset = 0;\n    }\n\n    if (count) {\n      l = Math.min(count * stride + offset, a.length);\n    } else {\n      l = a.length;\n    }\n\n    for (i = offset; i < l; i += stride) {\n      vec[0] = a[i];vec[1] = a[i + 1];\n      fn(vec, vec, arg);\n      a[i] = vec[0];a[i + 1] = vec[1];\n    }\n\n    return a;\n  };\n}();\n\n//# sourceURL=webpack:///./src/gl-matrix/vec2.js?");

/***/ }),

/***/ "./src/gl-matrix/vec3.js":
/*!*******************************!*\
  !*** ./src/gl-matrix/vec3.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.forEach = exports.sqrLen = exports.len = exports.sqrDist = exports.dist = exports.div = exports.mul = exports.sub = undefined;\nexports.create = create;\nexports.clone = clone;\nexports.length = length;\nexports.fromValues = fromValues;\nexports.copy = copy;\nexports.set = set;\nexports.add = add;\nexports.subtract = subtract;\nexports.multiply = multiply;\nexports.divide = divide;\nexports.ceil = ceil;\nexports.floor = floor;\nexports.min = min;\nexports.max = max;\nexports.round = round;\nexports.scale = scale;\nexports.scaleAndAdd = scaleAndAdd;\nexports.distance = distance;\nexports.squaredDistance = squaredDistance;\nexports.squaredLength = squaredLength;\nexports.negate = negate;\nexports.inverse = inverse;\nexports.normalize = normalize;\nexports.dot = dot;\nexports.cross = cross;\nexports.lerp = lerp;\nexports.hermite = hermite;\nexports.bezier = bezier;\nexports.random = random;\nexports.transformMat4 = transformMat4;\nexports.transformMat3 = transformMat3;\nexports.transformQuat = transformQuat;\nexports.rotateX = rotateX;\nexports.rotateY = rotateY;\nexports.rotateZ = rotateZ;\nexports.angle = angle;\nexports.str = str;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * 3 Dimensional Vector\n * @module vec3\n */\n\n/**\n * Creates a new, empty vec3\n *\n * @returns {vec3} a new 3D vector\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(3);\n  out[0] = 0;\n  out[1] = 0;\n  out[2] = 0;\n  return out;\n}\n\n/**\n * Creates a new vec3 initialized with values from an existing vector\n *\n * @param {vec3} a vector to clone\n * @returns {vec3} a new 3D vector\n */\nfunction clone(a) {\n  var out = new glMatrix.ARRAY_TYPE(3);\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  return out;\n}\n\n/**\n * Calculates the length of a vec3\n *\n * @param {vec3} a vector to calculate length of\n * @returns {Number} length of a\n */\nfunction length(a) {\n  var x = a[0];\n  var y = a[1];\n  var z = a[2];\n  return Math.sqrt(x * x + y * y + z * z);\n}\n\n/**\n * Creates a new vec3 initialized with the given values\n *\n * @param {Number} x X component\n * @param {Number} y Y component\n * @param {Number} z Z component\n * @returns {vec3} a new 3D vector\n */\nfunction fromValues(x, y, z) {\n  var out = new glMatrix.ARRAY_TYPE(3);\n  out[0] = x;\n  out[1] = y;\n  out[2] = z;\n  return out;\n}\n\n/**\n * Copy the values from one vec3 to another\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the source vector\n * @returns {vec3} out\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  return out;\n}\n\n/**\n * Set the components of a vec3 to the given values\n *\n * @param {vec3} out the receiving vector\n * @param {Number} x X component\n * @param {Number} y Y component\n * @param {Number} z Z component\n * @returns {vec3} out\n */\nfunction set(out, x, y, z) {\n  out[0] = x;\n  out[1] = y;\n  out[2] = z;\n  return out;\n}\n\n/**\n * Adds two vec3's\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {vec3} out\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  out[2] = a[2] + b[2];\n  return out;\n}\n\n/**\n * Subtracts vector b from vector a\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {vec3} out\n */\nfunction subtract(out, a, b) {\n  out[0] = a[0] - b[0];\n  out[1] = a[1] - b[1];\n  out[2] = a[2] - b[2];\n  return out;\n}\n\n/**\n * Multiplies two vec3's\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {vec3} out\n */\nfunction multiply(out, a, b) {\n  out[0] = a[0] * b[0];\n  out[1] = a[1] * b[1];\n  out[2] = a[2] * b[2];\n  return out;\n}\n\n/**\n * Divides two vec3's\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {vec3} out\n */\nfunction divide(out, a, b) {\n  out[0] = a[0] / b[0];\n  out[1] = a[1] / b[1];\n  out[2] = a[2] / b[2];\n  return out;\n}\n\n/**\n * Math.ceil the components of a vec3\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a vector to ceil\n * @returns {vec3} out\n */\nfunction ceil(out, a) {\n  out[0] = Math.ceil(a[0]);\n  out[1] = Math.ceil(a[1]);\n  out[2] = Math.ceil(a[2]);\n  return out;\n}\n\n/**\n * Math.floor the components of a vec3\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a vector to floor\n * @returns {vec3} out\n */\nfunction floor(out, a) {\n  out[0] = Math.floor(a[0]);\n  out[1] = Math.floor(a[1]);\n  out[2] = Math.floor(a[2]);\n  return out;\n}\n\n/**\n * Returns the minimum of two vec3's\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {vec3} out\n */\nfunction min(out, a, b) {\n  out[0] = Math.min(a[0], b[0]);\n  out[1] = Math.min(a[1], b[1]);\n  out[2] = Math.min(a[2], b[2]);\n  return out;\n}\n\n/**\n * Returns the maximum of two vec3's\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {vec3} out\n */\nfunction max(out, a, b) {\n  out[0] = Math.max(a[0], b[0]);\n  out[1] = Math.max(a[1], b[1]);\n  out[2] = Math.max(a[2], b[2]);\n  return out;\n}\n\n/**\n * Math.round the components of a vec3\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a vector to round\n * @returns {vec3} out\n */\nfunction round(out, a) {\n  out[0] = Math.round(a[0]);\n  out[1] = Math.round(a[1]);\n  out[2] = Math.round(a[2]);\n  return out;\n}\n\n/**\n * Scales a vec3 by a scalar number\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the vector to scale\n * @param {Number} b amount to scale the vector by\n * @returns {vec3} out\n */\nfunction scale(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  out[2] = a[2] * b;\n  return out;\n}\n\n/**\n * Adds two vec3's after scaling the second operand by a scalar value\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @param {Number} scale the amount to scale b by before adding\n * @returns {vec3} out\n */\nfunction scaleAndAdd(out, a, b, scale) {\n  out[0] = a[0] + b[0] * scale;\n  out[1] = a[1] + b[1] * scale;\n  out[2] = a[2] + b[2] * scale;\n  return out;\n}\n\n/**\n * Calculates the euclidian distance between two vec3's\n *\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {Number} distance between a and b\n */\nfunction distance(a, b) {\n  var x = b[0] - a[0];\n  var y = b[1] - a[1];\n  var z = b[2] - a[2];\n  return Math.sqrt(x * x + y * y + z * z);\n}\n\n/**\n * Calculates the squared euclidian distance between two vec3's\n *\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {Number} squared distance between a and b\n */\nfunction squaredDistance(a, b) {\n  var x = b[0] - a[0];\n  var y = b[1] - a[1];\n  var z = b[2] - a[2];\n  return x * x + y * y + z * z;\n}\n\n/**\n * Calculates the squared length of a vec3\n *\n * @param {vec3} a vector to calculate squared length of\n * @returns {Number} squared length of a\n */\nfunction squaredLength(a) {\n  var x = a[0];\n  var y = a[1];\n  var z = a[2];\n  return x * x + y * y + z * z;\n}\n\n/**\n * Negates the components of a vec3\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a vector to negate\n * @returns {vec3} out\n */\nfunction negate(out, a) {\n  out[0] = -a[0];\n  out[1] = -a[1];\n  out[2] = -a[2];\n  return out;\n}\n\n/**\n * Returns the inverse of the components of a vec3\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a vector to invert\n * @returns {vec3} out\n */\nfunction inverse(out, a) {\n  out[0] = 1.0 / a[0];\n  out[1] = 1.0 / a[1];\n  out[2] = 1.0 / a[2];\n  return out;\n}\n\n/**\n * Normalize a vec3\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a vector to normalize\n * @returns {vec3} out\n */\nfunction normalize(out, a) {\n  var x = a[0];\n  var y = a[1];\n  var z = a[2];\n  var len = x * x + y * y + z * z;\n  if (len > 0) {\n    //TODO: evaluate use of glm_invsqrt here?\n    len = 1 / Math.sqrt(len);\n    out[0] = a[0] * len;\n    out[1] = a[1] * len;\n    out[2] = a[2] * len;\n  }\n  return out;\n}\n\n/**\n * Calculates the dot product of two vec3's\n *\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {Number} dot product of a and b\n */\nfunction dot(a, b) {\n  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];\n}\n\n/**\n * Computes the cross product of two vec3's\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @returns {vec3} out\n */\nfunction cross(out, a, b) {\n  var ax = a[0],\n      ay = a[1],\n      az = a[2];\n  var bx = b[0],\n      by = b[1],\n      bz = b[2];\n\n  out[0] = ay * bz - az * by;\n  out[1] = az * bx - ax * bz;\n  out[2] = ax * by - ay * bx;\n  return out;\n}\n\n/**\n * Performs a linear interpolation between two vec3's\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {vec3} out\n */\nfunction lerp(out, a, b, t) {\n  var ax = a[0];\n  var ay = a[1];\n  var az = a[2];\n  out[0] = ax + t * (b[0] - ax);\n  out[1] = ay + t * (b[1] - ay);\n  out[2] = az + t * (b[2] - az);\n  return out;\n}\n\n/**\n * Performs a hermite interpolation with two control points\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @param {vec3} c the third operand\n * @param {vec3} d the fourth operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {vec3} out\n */\nfunction hermite(out, a, b, c, d, t) {\n  var factorTimes2 = t * t;\n  var factor1 = factorTimes2 * (2 * t - 3) + 1;\n  var factor2 = factorTimes2 * (t - 2) + t;\n  var factor3 = factorTimes2 * (t - 1);\n  var factor4 = factorTimes2 * (3 - 2 * t);\n\n  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;\n  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;\n  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;\n\n  return out;\n}\n\n/**\n * Performs a bezier interpolation with two control points\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the first operand\n * @param {vec3} b the second operand\n * @param {vec3} c the third operand\n * @param {vec3} d the fourth operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {vec3} out\n */\nfunction bezier(out, a, b, c, d, t) {\n  var inverseFactor = 1 - t;\n  var inverseFactorTimesTwo = inverseFactor * inverseFactor;\n  var factorTimes2 = t * t;\n  var factor1 = inverseFactorTimesTwo * inverseFactor;\n  var factor2 = 3 * t * inverseFactorTimesTwo;\n  var factor3 = 3 * factorTimes2 * inverseFactor;\n  var factor4 = factorTimes2 * t;\n\n  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;\n  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;\n  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;\n\n  return out;\n}\n\n/**\n * Generates a random vector with the given scale\n *\n * @param {vec3} out the receiving vector\n * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned\n * @returns {vec3} out\n */\nfunction random(out, scale) {\n  scale = scale || 1.0;\n\n  var r = glMatrix.RANDOM() * 2.0 * Math.PI;\n  var z = glMatrix.RANDOM() * 2.0 - 1.0;\n  var zScale = Math.sqrt(1.0 - z * z) * scale;\n\n  out[0] = Math.cos(r) * zScale;\n  out[1] = Math.sin(r) * zScale;\n  out[2] = z * scale;\n  return out;\n}\n\n/**\n * Transforms the vec3 with a mat4.\n * 4th vector component is implicitly '1'\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the vector to transform\n * @param {mat4} m matrix to transform with\n * @returns {vec3} out\n */\nfunction transformMat4(out, a, m) {\n  var x = a[0],\n      y = a[1],\n      z = a[2];\n  var w = m[3] * x + m[7] * y + m[11] * z + m[15];\n  w = w || 1.0;\n  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;\n  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;\n  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;\n  return out;\n}\n\n/**\n * Transforms the vec3 with a mat3.\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the vector to transform\n * @param {mat3} m the 3x3 matrix to transform with\n * @returns {vec3} out\n */\nfunction transformMat3(out, a, m) {\n  var x = a[0],\n      y = a[1],\n      z = a[2];\n  out[0] = x * m[0] + y * m[3] + z * m[6];\n  out[1] = x * m[1] + y * m[4] + z * m[7];\n  out[2] = x * m[2] + y * m[5] + z * m[8];\n  return out;\n}\n\n/**\n * Transforms the vec3 with a quat\n * Can also be used for dual quaternions. (Multiply it with the real part)\n *\n * @param {vec3} out the receiving vector\n * @param {vec3} a the vector to transform\n * @param {quat} q quaternion to transform with\n * @returns {vec3} out\n */\nfunction transformQuat(out, a, q) {\n  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed\n  var qx = q[0],\n      qy = q[1],\n      qz = q[2],\n      qw = q[3];\n  var x = a[0],\n      y = a[1],\n      z = a[2];\n  // var qvec = [qx, qy, qz];\n  // var uv = vec3.cross([], qvec, a);\n  var uvx = qy * z - qz * y,\n      uvy = qz * x - qx * z,\n      uvz = qx * y - qy * x;\n  // var uuv = vec3.cross([], qvec, uv);\n  var uuvx = qy * uvz - qz * uvy,\n      uuvy = qz * uvx - qx * uvz,\n      uuvz = qx * uvy - qy * uvx;\n  // vec3.scale(uv, uv, 2 * w);\n  var w2 = qw * 2;\n  uvx *= w2;\n  uvy *= w2;\n  uvz *= w2;\n  // vec3.scale(uuv, uuv, 2);\n  uuvx *= 2;\n  uuvy *= 2;\n  uuvz *= 2;\n  // return vec3.add(out, a, vec3.add(out, uv, uuv));\n  out[0] = x + uvx + uuvx;\n  out[1] = y + uvy + uuvy;\n  out[2] = z + uvz + uuvz;\n  return out;\n}\n\n/**\n * Rotate a 3D vector around the x-axis\n * @param {vec3} out The receiving vec3\n * @param {vec3} a The vec3 point to rotate\n * @param {vec3} b The origin of the rotation\n * @param {Number} c The angle of rotation\n * @returns {vec3} out\n */\nfunction rotateX(out, a, b, c) {\n  var p = [],\n      r = [];\n  //Translate point to the origin\n  p[0] = a[0] - b[0];\n  p[1] = a[1] - b[1];\n  p[2] = a[2] - b[2];\n\n  //perform rotation\n  r[0] = p[0];\n  r[1] = p[1] * Math.cos(c) - p[2] * Math.sin(c);\n  r[2] = p[1] * Math.sin(c) + p[2] * Math.cos(c);\n\n  //translate to correct position\n  out[0] = r[0] + b[0];\n  out[1] = r[1] + b[1];\n  out[2] = r[2] + b[2];\n\n  return out;\n}\n\n/**\n * Rotate a 3D vector around the y-axis\n * @param {vec3} out The receiving vec3\n * @param {vec3} a The vec3 point to rotate\n * @param {vec3} b The origin of the rotation\n * @param {Number} c The angle of rotation\n * @returns {vec3} out\n */\nfunction rotateY(out, a, b, c) {\n  var p = [],\n      r = [];\n  //Translate point to the origin\n  p[0] = a[0] - b[0];\n  p[1] = a[1] - b[1];\n  p[2] = a[2] - b[2];\n\n  //perform rotation\n  r[0] = p[2] * Math.sin(c) + p[0] * Math.cos(c);\n  r[1] = p[1];\n  r[2] = p[2] * Math.cos(c) - p[0] * Math.sin(c);\n\n  //translate to correct position\n  out[0] = r[0] + b[0];\n  out[1] = r[1] + b[1];\n  out[2] = r[2] + b[2];\n\n  return out;\n}\n\n/**\n * Rotate a 3D vector around the z-axis\n * @param {vec3} out The receiving vec3\n * @param {vec3} a The vec3 point to rotate\n * @param {vec3} b The origin of the rotation\n * @param {Number} c The angle of rotation\n * @returns {vec3} out\n */\nfunction rotateZ(out, a, b, c) {\n  var p = [],\n      r = [];\n  //Translate point to the origin\n  p[0] = a[0] - b[0];\n  p[1] = a[1] - b[1];\n  p[2] = a[2] - b[2];\n\n  //perform rotation\n  r[0] = p[0] * Math.cos(c) - p[1] * Math.sin(c);\n  r[1] = p[0] * Math.sin(c) + p[1] * Math.cos(c);\n  r[2] = p[2];\n\n  //translate to correct position\n  out[0] = r[0] + b[0];\n  out[1] = r[1] + b[1];\n  out[2] = r[2] + b[2];\n\n  return out;\n}\n\n/**\n * Get the angle between two 3D vectors\n * @param {vec3} a The first operand\n * @param {vec3} b The second operand\n * @returns {Number} The angle in radians\n */\nfunction angle(a, b) {\n  var tempA = fromValues(a[0], a[1], a[2]);\n  var tempB = fromValues(b[0], b[1], b[2]);\n\n  normalize(tempA, tempA);\n  normalize(tempB, tempB);\n\n  var cosine = dot(tempA, tempB);\n\n  if (cosine > 1.0) {\n    return 0;\n  } else if (cosine < -1.0) {\n    return Math.PI;\n  } else {\n    return Math.acos(cosine);\n  }\n}\n\n/**\n * Returns a string representation of a vector\n *\n * @param {vec3} a vector to represent as a string\n * @returns {String} string representation of the vector\n */\nfunction str(a) {\n  return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';\n}\n\n/**\n * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)\n *\n * @param {vec3} a The first vector.\n * @param {vec3} b The second vector.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];\n}\n\n/**\n * Returns whether or not the vectors have approximately the same elements in the same position.\n *\n * @param {vec3} a The first vector.\n * @param {vec3} b The second vector.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2];\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2));\n}\n\n/**\n * Alias for {@link vec3.subtract}\n * @function\n */\nvar sub = exports.sub = subtract;\n\n/**\n * Alias for {@link vec3.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Alias for {@link vec3.divide}\n * @function\n */\nvar div = exports.div = divide;\n\n/**\n * Alias for {@link vec3.distance}\n * @function\n */\nvar dist = exports.dist = distance;\n\n/**\n * Alias for {@link vec3.squaredDistance}\n * @function\n */\nvar sqrDist = exports.sqrDist = squaredDistance;\n\n/**\n * Alias for {@link vec3.length}\n * @function\n */\nvar len = exports.len = length;\n\n/**\n * Alias for {@link vec3.squaredLength}\n * @function\n */\nvar sqrLen = exports.sqrLen = squaredLength;\n\n/**\n * Perform some operation over an array of vec3s.\n *\n * @param {Array} a the array of vectors to iterate over\n * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed\n * @param {Number} offset Number of elements to skip at the beginning of the array\n * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array\n * @param {Function} fn Function to call for each vector in the array\n * @param {Object} [arg] additional argument to pass to fn\n * @returns {Array} a\n * @function\n */\nvar forEach = exports.forEach = function () {\n  var vec = create();\n\n  return function (a, stride, offset, count, fn, arg) {\n    var i = void 0,\n        l = void 0;\n    if (!stride) {\n      stride = 3;\n    }\n\n    if (!offset) {\n      offset = 0;\n    }\n\n    if (count) {\n      l = Math.min(count * stride + offset, a.length);\n    } else {\n      l = a.length;\n    }\n\n    for (i = offset; i < l; i += stride) {\n      vec[0] = a[i];vec[1] = a[i + 1];vec[2] = a[i + 2];\n      fn(vec, vec, arg);\n      a[i] = vec[0];a[i + 1] = vec[1];a[i + 2] = vec[2];\n    }\n\n    return a;\n  };\n}();\n\n//# sourceURL=webpack:///./src/gl-matrix/vec3.js?");

/***/ }),

/***/ "./src/gl-matrix/vec4.js":
/*!*******************************!*\
  !*** ./src/gl-matrix/vec4.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.forEach = exports.sqrLen = exports.len = exports.sqrDist = exports.dist = exports.div = exports.mul = exports.sub = undefined;\nexports.create = create;\nexports.clone = clone;\nexports.fromValues = fromValues;\nexports.copy = copy;\nexports.set = set;\nexports.add = add;\nexports.subtract = subtract;\nexports.multiply = multiply;\nexports.divide = divide;\nexports.ceil = ceil;\nexports.floor = floor;\nexports.min = min;\nexports.max = max;\nexports.round = round;\nexports.scale = scale;\nexports.scaleAndAdd = scaleAndAdd;\nexports.distance = distance;\nexports.squaredDistance = squaredDistance;\nexports.length = length;\nexports.squaredLength = squaredLength;\nexports.negate = negate;\nexports.inverse = inverse;\nexports.normalize = normalize;\nexports.dot = dot;\nexports.lerp = lerp;\nexports.random = random;\nexports.transformMat4 = transformMat4;\nexports.transformQuat = transformQuat;\nexports.str = str;\nexports.exactEquals = exactEquals;\nexports.equals = equals;\n\nvar _common = __webpack_require__(/*! ./common.js */ \"./src/gl-matrix/common.js\");\n\nvar glMatrix = _interopRequireWildcard(_common);\n\nfunction _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }\n\n/**\n * 4 Dimensional Vector\n * @module vec4\n */\n\n/**\n * Creates a new, empty vec4\n *\n * @returns {vec4} a new 4D vector\n */\nfunction create() {\n  var out = new glMatrix.ARRAY_TYPE(4);\n  out[0] = 0;\n  out[1] = 0;\n  out[2] = 0;\n  out[3] = 0;\n  return out;\n}\n\n/**\n * Creates a new vec4 initialized with values from an existing vector\n *\n * @param {vec4} a vector to clone\n * @returns {vec4} a new 4D vector\n */\nfunction clone(a) {\n  var out = new glMatrix.ARRAY_TYPE(4);\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  return out;\n}\n\n/**\n * Creates a new vec4 initialized with the given values\n *\n * @param {Number} x X component\n * @param {Number} y Y component\n * @param {Number} z Z component\n * @param {Number} w W component\n * @returns {vec4} a new 4D vector\n */\nfunction fromValues(x, y, z, w) {\n  var out = new glMatrix.ARRAY_TYPE(4);\n  out[0] = x;\n  out[1] = y;\n  out[2] = z;\n  out[3] = w;\n  return out;\n}\n\n/**\n * Copy the values from one vec4 to another\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the source vector\n * @returns {vec4} out\n */\nfunction copy(out, a) {\n  out[0] = a[0];\n  out[1] = a[1];\n  out[2] = a[2];\n  out[3] = a[3];\n  return out;\n}\n\n/**\n * Set the components of a vec4 to the given values\n *\n * @param {vec4} out the receiving vector\n * @param {Number} x X component\n * @param {Number} y Y component\n * @param {Number} z Z component\n * @param {Number} w W component\n * @returns {vec4} out\n */\nfunction set(out, x, y, z, w) {\n  out[0] = x;\n  out[1] = y;\n  out[2] = z;\n  out[3] = w;\n  return out;\n}\n\n/**\n * Adds two vec4's\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {vec4} out\n */\nfunction add(out, a, b) {\n  out[0] = a[0] + b[0];\n  out[1] = a[1] + b[1];\n  out[2] = a[2] + b[2];\n  out[3] = a[3] + b[3];\n  return out;\n}\n\n/**\n * Subtracts vector b from vector a\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {vec4} out\n */\nfunction subtract(out, a, b) {\n  out[0] = a[0] - b[0];\n  out[1] = a[1] - b[1];\n  out[2] = a[2] - b[2];\n  out[3] = a[3] - b[3];\n  return out;\n}\n\n/**\n * Multiplies two vec4's\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {vec4} out\n */\nfunction multiply(out, a, b) {\n  out[0] = a[0] * b[0];\n  out[1] = a[1] * b[1];\n  out[2] = a[2] * b[2];\n  out[3] = a[3] * b[3];\n  return out;\n}\n\n/**\n * Divides two vec4's\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {vec4} out\n */\nfunction divide(out, a, b) {\n  out[0] = a[0] / b[0];\n  out[1] = a[1] / b[1];\n  out[2] = a[2] / b[2];\n  out[3] = a[3] / b[3];\n  return out;\n}\n\n/**\n * Math.ceil the components of a vec4\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a vector to ceil\n * @returns {vec4} out\n */\nfunction ceil(out, a) {\n  out[0] = Math.ceil(a[0]);\n  out[1] = Math.ceil(a[1]);\n  out[2] = Math.ceil(a[2]);\n  out[3] = Math.ceil(a[3]);\n  return out;\n}\n\n/**\n * Math.floor the components of a vec4\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a vector to floor\n * @returns {vec4} out\n */\nfunction floor(out, a) {\n  out[0] = Math.floor(a[0]);\n  out[1] = Math.floor(a[1]);\n  out[2] = Math.floor(a[2]);\n  out[3] = Math.floor(a[3]);\n  return out;\n}\n\n/**\n * Returns the minimum of two vec4's\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {vec4} out\n */\nfunction min(out, a, b) {\n  out[0] = Math.min(a[0], b[0]);\n  out[1] = Math.min(a[1], b[1]);\n  out[2] = Math.min(a[2], b[2]);\n  out[3] = Math.min(a[3], b[3]);\n  return out;\n}\n\n/**\n * Returns the maximum of two vec4's\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {vec4} out\n */\nfunction max(out, a, b) {\n  out[0] = Math.max(a[0], b[0]);\n  out[1] = Math.max(a[1], b[1]);\n  out[2] = Math.max(a[2], b[2]);\n  out[3] = Math.max(a[3], b[3]);\n  return out;\n}\n\n/**\n * Math.round the components of a vec4\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a vector to round\n * @returns {vec4} out\n */\nfunction round(out, a) {\n  out[0] = Math.round(a[0]);\n  out[1] = Math.round(a[1]);\n  out[2] = Math.round(a[2]);\n  out[3] = Math.round(a[3]);\n  return out;\n}\n\n/**\n * Scales a vec4 by a scalar number\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the vector to scale\n * @param {Number} b amount to scale the vector by\n * @returns {vec4} out\n */\nfunction scale(out, a, b) {\n  out[0] = a[0] * b;\n  out[1] = a[1] * b;\n  out[2] = a[2] * b;\n  out[3] = a[3] * b;\n  return out;\n}\n\n/**\n * Adds two vec4's after scaling the second operand by a scalar value\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @param {Number} scale the amount to scale b by before adding\n * @returns {vec4} out\n */\nfunction scaleAndAdd(out, a, b, scale) {\n  out[0] = a[0] + b[0] * scale;\n  out[1] = a[1] + b[1] * scale;\n  out[2] = a[2] + b[2] * scale;\n  out[3] = a[3] + b[3] * scale;\n  return out;\n}\n\n/**\n * Calculates the euclidian distance between two vec4's\n *\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {Number} distance between a and b\n */\nfunction distance(a, b) {\n  var x = b[0] - a[0];\n  var y = b[1] - a[1];\n  var z = b[2] - a[2];\n  var w = b[3] - a[3];\n  return Math.sqrt(x * x + y * y + z * z + w * w);\n}\n\n/**\n * Calculates the squared euclidian distance between two vec4's\n *\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {Number} squared distance between a and b\n */\nfunction squaredDistance(a, b) {\n  var x = b[0] - a[0];\n  var y = b[1] - a[1];\n  var z = b[2] - a[2];\n  var w = b[3] - a[3];\n  return x * x + y * y + z * z + w * w;\n}\n\n/**\n * Calculates the length of a vec4\n *\n * @param {vec4} a vector to calculate length of\n * @returns {Number} length of a\n */\nfunction length(a) {\n  var x = a[0];\n  var y = a[1];\n  var z = a[2];\n  var w = a[3];\n  return Math.sqrt(x * x + y * y + z * z + w * w);\n}\n\n/**\n * Calculates the squared length of a vec4\n *\n * @param {vec4} a vector to calculate squared length of\n * @returns {Number} squared length of a\n */\nfunction squaredLength(a) {\n  var x = a[0];\n  var y = a[1];\n  var z = a[2];\n  var w = a[3];\n  return x * x + y * y + z * z + w * w;\n}\n\n/**\n * Negates the components of a vec4\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a vector to negate\n * @returns {vec4} out\n */\nfunction negate(out, a) {\n  out[0] = -a[0];\n  out[1] = -a[1];\n  out[2] = -a[2];\n  out[3] = -a[3];\n  return out;\n}\n\n/**\n * Returns the inverse of the components of a vec4\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a vector to invert\n * @returns {vec4} out\n */\nfunction inverse(out, a) {\n  out[0] = 1.0 / a[0];\n  out[1] = 1.0 / a[1];\n  out[2] = 1.0 / a[2];\n  out[3] = 1.0 / a[3];\n  return out;\n}\n\n/**\n * Normalize a vec4\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a vector to normalize\n * @returns {vec4} out\n */\nfunction normalize(out, a) {\n  var x = a[0];\n  var y = a[1];\n  var z = a[2];\n  var w = a[3];\n  var len = x * x + y * y + z * z + w * w;\n  if (len > 0) {\n    len = 1 / Math.sqrt(len);\n    out[0] = x * len;\n    out[1] = y * len;\n    out[2] = z * len;\n    out[3] = w * len;\n  }\n  return out;\n}\n\n/**\n * Calculates the dot product of two vec4's\n *\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @returns {Number} dot product of a and b\n */\nfunction dot(a, b) {\n  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];\n}\n\n/**\n * Performs a linear interpolation between two vec4's\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the first operand\n * @param {vec4} b the second operand\n * @param {Number} t interpolation amount, in the range [0-1], between the two inputs\n * @returns {vec4} out\n */\nfunction lerp(out, a, b, t) {\n  var ax = a[0];\n  var ay = a[1];\n  var az = a[2];\n  var aw = a[3];\n  out[0] = ax + t * (b[0] - ax);\n  out[1] = ay + t * (b[1] - ay);\n  out[2] = az + t * (b[2] - az);\n  out[3] = aw + t * (b[3] - aw);\n  return out;\n}\n\n/**\n * Generates a random vector with the given scale\n *\n * @param {vec4} out the receiving vector\n * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned\n * @returns {vec4} out\n */\nfunction random(out, vectorScale) {\n  vectorScale = vectorScale || 1.0;\n\n  // Marsaglia, George. Choosing a Point from the Surface of a\n  // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.\n  // http://projecteuclid.org/euclid.aoms/1177692644;\n  var v1, v2, v3, v4;\n  var s1, s2;\n  do {\n    v1 = glMatrix.RANDOM() * 2 - 1;\n    v2 = glMatrix.RANDOM() * 2 - 1;\n    s1 = v1 * v1 + v2 * v2;\n  } while (s1 >= 1);\n  do {\n    v3 = glMatrix.RANDOM() * 2 - 1;\n    v4 = glMatrix.RANDOM() * 2 - 1;\n    s2 = v3 * v3 + v4 * v4;\n  } while (s2 >= 1);\n\n  var d = Math.sqrt((1 - s1) / s2);\n  out[0] = scale * v1;\n  out[1] = scale * v2;\n  out[2] = scale * v3 * d;\n  out[3] = scale * v4 * d;\n  return out;\n}\n\n/**\n * Transforms the vec4 with a mat4.\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the vector to transform\n * @param {mat4} m matrix to transform with\n * @returns {vec4} out\n */\nfunction transformMat4(out, a, m) {\n  var x = a[0],\n      y = a[1],\n      z = a[2],\n      w = a[3];\n  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;\n  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;\n  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;\n  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;\n  return out;\n}\n\n/**\n * Transforms the vec4 with a quat\n *\n * @param {vec4} out the receiving vector\n * @param {vec4} a the vector to transform\n * @param {quat} q quaternion to transform with\n * @returns {vec4} out\n */\nfunction transformQuat(out, a, q) {\n  var x = a[0],\n      y = a[1],\n      z = a[2];\n  var qx = q[0],\n      qy = q[1],\n      qz = q[2],\n      qw = q[3];\n\n  // calculate quat * vec\n  var ix = qw * x + qy * z - qz * y;\n  var iy = qw * y + qz * x - qx * z;\n  var iz = qw * z + qx * y - qy * x;\n  var iw = -qx * x - qy * y - qz * z;\n\n  // calculate result * inverse quat\n  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;\n  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;\n  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;\n  out[3] = a[3];\n  return out;\n}\n\n/**\n * Returns a string representation of a vector\n *\n * @param {vec4} a vector to represent as a string\n * @returns {String} string representation of the vector\n */\nfunction str(a) {\n  return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';\n}\n\n/**\n * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)\n *\n * @param {vec4} a The first vector.\n * @param {vec4} b The second vector.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nfunction exactEquals(a, b) {\n  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];\n}\n\n/**\n * Returns whether or not the vectors have approximately the same elements in the same position.\n *\n * @param {vec4} a The first vector.\n * @param {vec4} b The second vector.\n * @returns {Boolean} True if the vectors are equal, false otherwise.\n */\nfunction equals(a, b) {\n  var a0 = a[0],\n      a1 = a[1],\n      a2 = a[2],\n      a3 = a[3];\n  var b0 = b[0],\n      b1 = b[1],\n      b2 = b[2],\n      b3 = b[3];\n  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3));\n}\n\n/**\n * Alias for {@link vec4.subtract}\n * @function\n */\nvar sub = exports.sub = subtract;\n\n/**\n * Alias for {@link vec4.multiply}\n * @function\n */\nvar mul = exports.mul = multiply;\n\n/**\n * Alias for {@link vec4.divide}\n * @function\n */\nvar div = exports.div = divide;\n\n/**\n * Alias for {@link vec4.distance}\n * @function\n */\nvar dist = exports.dist = distance;\n\n/**\n * Alias for {@link vec4.squaredDistance}\n * @function\n */\nvar sqrDist = exports.sqrDist = squaredDistance;\n\n/**\n * Alias for {@link vec4.length}\n * @function\n */\nvar len = exports.len = length;\n\n/**\n * Alias for {@link vec4.squaredLength}\n * @function\n */\nvar sqrLen = exports.sqrLen = squaredLength;\n\n/**\n * Perform some operation over an array of vec4s.\n *\n * @param {Array} a the array of vectors to iterate over\n * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed\n * @param {Number} offset Number of elements to skip at the beginning of the array\n * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array\n * @param {Function} fn Function to call for each vector in the array\n * @param {Object} [arg] additional argument to pass to fn\n * @returns {Array} a\n * @function\n */\nvar forEach = exports.forEach = function () {\n  var vec = create();\n\n  return function (a, stride, offset, count, fn, arg) {\n    var i = void 0,\n        l = void 0;\n    if (!stride) {\n      stride = 4;\n    }\n\n    if (!offset) {\n      offset = 0;\n    }\n\n    if (count) {\n      l = Math.min(count * stride + offset, a.length);\n    } else {\n      l = a.length;\n    }\n\n    for (i = offset; i < l; i += stride) {\n      vec[0] = a[i];vec[1] = a[i + 1];vec[2] = a[i + 2];vec[3] = a[i + 3];\n      fn(vec, vec, arg);\n      a[i] = vec[0];a[i + 1] = vec[1];a[i + 2] = vec[2];a[i + 3] = vec[3];\n    }\n\n    return a;\n  };\n}();\n\n//# sourceURL=webpack:///./src/gl-matrix/vec4.js?");

/***/ })

/******/ });
});
},{}],42:[function(require,module,exports){
(function (process){
var keys = require('vkey')
var list = Object.keys(keys)
var down = {}

reset()

module.exports = pressed

if (process.browser) {
  window.addEventListener('keydown', keydown, false)
  window.addEventListener('keyup', keyup, false)
  window.addEventListener('blur', reset, false)
}

function pressed(key) {
  return key
    ? down[key]
    : down
}

function reset() {
  list.forEach(function(code) {
    down[keys[code]] = false
  })
}

function keyup(e) {
  down[keys[e.keyCode]] = false
}

function keydown(e) {
  down[keys[e.keyCode]] = true
}

}).call(this,require('_process'))

},{"_process":52,"vkey":56}],43:[function(require,module,exports){
var Emitter = require('events/')

module.exports = attach

function attach(element, listener) {
  var position = new Emitter

  position.x = 0
  position.y = 0
  position.prevX = 0
  position.prevY = 0
  position.flush = flush

  if (typeof window === 'undefined') {
    return position
  }

  listener = listener || element || window
  element  = element  || document.body
  listener.addEventListener('mousemove', (
       element === document.body
    || element === window
  ) ? function(e) {
      position.prevX = position.x
      position.prevY = position.y
      position.x = e.clientX
      position.y = e.clientY
      position.emit('move', e)
    }
    : function(e) {
      position.prevX = position.x
      position.prevY = position.y
      var bounds = element.getBoundingClientRect()
      position.x = e.clientX - bounds.left
      position.y = e.clientY - bounds.top
      position.emit('move', e)
    }
  , false)

  return position

  function flush() {
    this.prevX = this.x
    this.prevY = this.y
  }
}

},{"events/":10}],44:[function(require,module,exports){
var Emitter = require('events/')
var map = [
    'left'
  , 'middle'
  , 'right'
]

module.exports = pressed

function pressed(element, preventDefault) {
  var mouse = new Emitter

  mouse.left = false
  mouse.right = false
  mouse.middle = false

  if (typeof window !== 'undefined') {
    element = element || window
    element.addEventListener('mousedown', mousedown, false)
    element.addEventListener('mouseup', mouseup, false)

    if (preventDefault) {
      element.addEventListener('contextmenu', function(e) {
        return e.preventDefault && e.preventDefault() && false
      }, false)
    }
  }

  return mouse

  function mousedown(e) {
    mouse.right = false
    mouse[map[e.button]] = true
    mouse.emit('down', e)

    if (!preventDefault) return
    if (!e.preventDefault) return false
    e.preventDefault()
    e.stopPropagation()
  }

  function mouseup(e) {
    mouse.right = false
    mouse[map[e.button]] = false
    mouse.emit('up', e)

    if (!preventDefault) return
    if (!e.preventDefault) return
    e.preventDefault()
    e.stopPropagation()
  }
}

},{"events/":10}],45:[function(require,module,exports){
"use strict"

var glm = require("gl-matrix")
var vec3 = glm.vec3
var mat3 = glm.mat3
var mat4 = glm.mat4
var quat = glm.quat

//Scratch variables
var scratch0 = new Float32Array(16)
var scratch1 = new Float32Array(16)

function OrbitCamera(rotation, center, distance) {
  this.rotation = rotation
  this.center   = center
  this.distance = distance
}

var proto = OrbitCamera.prototype

proto.view = function(out) {
  if(!out) {
    out = mat4.create()
  }
  scratch1[0] = scratch1[1] = 0.0
  scratch1[2] = -this.distance
  mat4.fromRotationTranslation(out,
    quat.conjugate(scratch0, this.rotation),
    scratch1)
  mat4.translate(out, out, vec3.negate(scratch0, this.center))
  return out
}

proto.lookAt = function(eye, center, up) {
  mat4.lookAt(scratch0, eye, center, up)
  mat3.fromMat4(scratch0, scratch0)
  quat.fromMat3(this.rotation, scratch0)
  vec3.copy(this.center, center)
  this.distance = vec3.distance(eye, center)
}

proto.pan = function(dpan) {
  var d = this.distance
  scratch0[0] = -d*(dpan[0]||0)
  scratch0[1] =  d*(dpan[1]||0)
  scratch0[2] =  d*(dpan[2]||0)
  vec3.transformQuat(scratch0, scratch0, this.rotation)
  vec3.add(this.center, this.center, scratch0)
}

proto.zoom = function(d) {
  this.distance += d
  if(this.distance < 0.0) {
    this.distance = 0.0
  }
}

function quatFromVec(out, da) {
  var x = da[0]
  var y = da[1]
  var z = da[2]
  var s = x*x + y*y
  if(s > 1.0) {
    s = 1.0
  }
  out[0] = -da[0]
  out[1] =  da[1]
  out[2] =  da[2] || Math.sqrt(1.0 - s)
  out[3] =  0.0
}

proto.rotate = function(da, db) {
  quatFromVec(scratch0, da)
  quatFromVec(scratch1, db)
  quat.invert(scratch1, scratch1)
  quat.multiply(scratch0, scratch0, scratch1)
  if(quat.length(scratch0) < 1e-6) {
    return
  }
  quat.multiply(this.rotation, this.rotation, scratch0)
  quat.normalize(this.rotation, this.rotation)
}

function createOrbitCamera(eye, target, up) {
  eye     = eye     || [0,0,-1]
  target  = target  || [0,0,0]
  up      = up      || [0,1,0]
  var camera = new OrbitCamera(quat.create(), vec3.create(), 1.0)
  camera.lookAt(eye, target, up)
  return camera
}

module.exports = createOrbitCamera

},{"gl-matrix":41}],46:[function(require,module,exports){
module.exports={
"TriangularAntiprism": {
"name":"Triangular Antiprism (Octahedron)",
"category":["Antiprism"],
"vertex":[[0,0,1.414214],[1.414214,0,0],[0,1.414214,0],[-1.414214,0,0],[0,-1.414214,0],[0,0,-1.414214]],
"edge":[[0,1],[0,2],[0,3],[0,4],[1,2],[1,4],[1,5],[2,3],[2,5],[3,4],[3,5],[4,5]],
"face":[[0,1,2],[0,2,3],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[3,5,4]]},

"SquareAntiPrism" : {
"name":"Square Antiprism",
"category":["Antiprism"],
"vertex":[[0,0,1.25928],[1.215563,0,0.3289288],[0.2517512,1.189207,0.3289288],[-1.111284,0.4925857,0.3289288],[-0.71206,-0.9851714,0.3289288],[0.5035025,-0.9851714,-0.6014224],[0.6077813,0.4925857,-0.9867865],[-0.7552537,-0.2040357,-0.9867865]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[1,5],[5,6],[6,1],[6,2],[3,7],[7,4],[7,5],[5,4],[7,6]],
"face":[[0,1,2],[0,2,3],[0,3,4],[1,5,6],[1,6,2],[3,7,4],[4,7,5],[5,7,6],[0,4,5,1],[2,6,7,3]]},

"PentagonalAntiPrism" : {
"name":"Pentagonal Antiprism",
"category":["Antiprism"],
"vertex":[[0,0,1.175571],[1.051462,0,0.5257311],[0.3249197,1,0.5257311],[-0.8506508,0.618034,0.5257311],[-0.8506508,-0.618034,0.5257311],[0.8506508,-0.618034,-0.5257311],[0.8506508,0.618034,-0.5257311],[-1.051462,0,-0.5257311],[-0.3249197,-1,-0.5257311],[0,0,-1.175571]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[1,5],[5,6],[6,1],[6,2],[3,7],[7,4],[7,8],[8,4],[5,8],[8,9],[9,5],[9,6],[7,9]],
"face":[[0,1,2],[0,2,3],[0,3,4],[1,5,6],[1,6,2],[3,7,4],[4,7,8],[5,8,9],[5,9,6],[7,9,8],[0,4,8,5,1],[2,6,9,7,3]]},

"HexagonalAntiprism" : {
"name":"Hexagonal Antiprism",
"category":["Antiprism"],
"vertex":[[0,0,1.126033],[0.9194017,0,0.6501152],[0.3365244,0.8555997,0.6501152],[-0.6730487,0.6263424,0.6501152],[-0.8292303,-0.3970852,0.6501152],[1.009573,-0.3970852,-0.3017195],[0.9194017,0.6263424,-0.1741978],[-1.099745,0.1678279,-0.1741978],[-0.7390588,-0.7941704,-0.3017195],[0.1803429,-0.7941704,-0.7776368],[0.4927059,0.1678279,-0.9985108],[-0.5168672,-0.06142929,-0.9985108]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[1,5],[5,6],[6,1],[6,2],[3,7],[7,4],[7,8],[8,4],[5,9],[9,10],[10,5],[10,6],[7,11],[11,8],[11,9],[9,8],[11,10]],
"face":[[0,1,2],[0,2,3],[0,3,4],[1,5,6],[1,6,2],[3,7,4],[4,7,8],[5,9,10],[5,10,6],[7,11,8],[8,11,9],[9,11,10],[0,4,8,9,5,1],[2,6,10,11,7,3]]},

"HeptagonalAntiprism" : {
"name":"Heptagonal Antiprism",
"category":["Antiprism"],
"vertex":[[0,0,1.09456],[0.8131884,0,0.7326574],[0.3260632,0.7449551,0.7326574],[-0.551706,0.5974076,0.7326574],[-0.7684971,-0.2658714,0.7326574],[1.058721,-0.2658714,-0.08053097],[0.9136089,0.5974076,0.08053097],[-1.058721,0.2658714,0.08053097],[-0.9136089,-0.5974076,-0.08053097],[0.551706,-0.5974076,-0.7326574],[0.7684971,0.2658714,-0.7326574],[-0.8131884,0,-0.7326574],[-0.3260632,-0.7449551,-0.7326574],[0,0,-1.09456]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[1,5],[5,6],[6,1],[6,2],[3,7],[7,4],[7,8],[8,4],[5,9],[9,10],[10,5],[10,6],[7,11],[11,8],[11,12],[12,8],[9,12],[12,13],[13,9],[13,10],[11,13]],
"face":[[0,1,2],[0,2,3],[0,3,4],[1,5,6],[1,6,2],[3,7,4],[4,7,8],[5,9,10],[5,10,6],[7,11,8],[8,11,12],[9,12,13],[9,13,10],[11,13,12],[0,4,8,12,9,5,1],[2,6,10,13,11,7,3]]},

"OctagonalAntiprism" : {
"name":"Octagonal Antiprism",
"category":["Antiprism"],
"vertex":[[0,0,1.073425],[0.7269827,0,0.7897703],[0.3081531,0.6584417,0.7897703],[-0.4657431,0.5581999,0.7897703],[-0.702991,-0.1852227,0.7897703],[1.0521,-0.1852227,0.1049676],[0.8775457,0.5581999,0.265645],[-0.990805,0.3161949,0.265645],[-0.9701878,-0.4471671,0.1049676],[0.7849037,-0.4471671,-0.5798351],[0.9088923,0.3161949,-0.4755801],[-0.9594584,0.07418979,-0.4755801],[-0.6450701,-0.6323897,-0.5798351],[0.08191263,-0.6323897,-0.8634897],[0.3838305,0.07418979,-0.9997054],[-0.3900657,-0.02605199,-0.9997054]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[1,5],[5,6],[6,1],[6,2],[3,7],[7,4],[7,8],[8,4],[5,9],[9,10],[10,5],[10,6],[7,11],[11,8],[11,12],[12,8],[9,13],[13,14],[14,9],[14,10],[11,15],[15,12],[15,13],[13,12],[15,14]],
"face":[[0,1,2],[0,2,3],[0,3,4],[1,5,6],[1,6,2],[3,7,4],[4,7,8],[5,9,10],[5,10,6],[7,11,8],[8,11,12],[9,13,14],[9,14,10],[11,15,12],[12,15,13],[13,15,14],[0,4,8,12,13,9,5,1],[2,6,10,14,15,11,7,3]]},

"EnneagonalAntiprism" : {
"name":"Enneagonal Antiprism",
"category":["Antiprism"],
"vertex":[[0,0,1.058591],[0.6561484,0,0.830713],[0.2885036,0.5893186,0.830713],[-0.4024426,0.518238,0.830713],[-0.6424056,-0.1335877,0.830713],[1.01902,-0.1335877,0.2537058],[0.830713,0.518238,0.4024426],[-0.9188241,0.3382559,0.4024426],[-0.9704798,-0.3382559,0.2537058],[0.9188241,-0.3382559,-0.4024426],[0.9704798,0.3382559,-0.2537058],[-1.01902,0.1335877,-0.2537058],[-0.830713,-0.518238,-0.4024426],[0.4024426,-0.518238,-0.830713],[0.6424056,0.1335877,-0.830713],[-0.6561484,0,-0.830713],[-0.2885036,-0.5893186,-0.830713],[0,0,-1.058591]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[1,5],[5,6],[6,1],[6,2],[3,7],[7,4],[7,8],[8,4],[5,9],[9,10],[10,5],[10,6],[7,11],[11,8],[11,12],[12,8],[9,13],[13,14],[14,9],[14,10],[11,15],[15,12],[15,16],[16,12],[13,16],[16,17],[17,13],[17,14],[15,17]],
"face":[[0,1,2],[0,2,3],[0,3,4],[1,5,6],[1,6,2],[3,7,4],[4,7,8],[5,9,10],[5,10,6],[7,11,8],[8,11,12],[9,13,14],[9,14,10],[11,15,12],[12,15,16],[13,16,17],[13,17,14],[15,17,16],[0,4,8,12,16,13,9,5,1],[2,6,10,14,17,15,11,7,3]]},

"DecagonalAntiprism" : {
"name":"Decagonal Antiprism",
"category":["Antiprism"],
"vertex":[[0,0,1.047801],[0.5971915,0,0.8609583],[0.2693671,0.5329907,0.8609583],[-0.3541919,0.4808178,0.8609583],[-0.5888883,-0.09923864,0.8609583],[0.9745794,-0.09923864,0.3717979],[0.7817338,0.4808178,0.5055625],[-0.8507649,0.3442276,0.5055625],[-0.944538,-0.2598101,0.3717979],[0.9880143,-0.2598101,-0.2328377],[0.9872015,0.3442276,-0.06948012],[-1.030678,0.1753927,-0.06948012],[-0.931103,-0.4203816,-0.2328377],[0.6323646,-0.4203816,-0.7219981],[0.8072886,0.1753927,-0.6445227],[-0.8252102,0.03880243,-0.6445227],[-0.5537152,-0.5196203,-0.7219981],[0.04347634,-0.5196203,-0.9088408],[0.3107156,0.03880243,-0.9999186],[-0.3128435,-0.01337041,-0.9999186]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[1,5],[5,6],[6,1],[6,2],[3,7],[7,4],[7,8],[8,4],[5,9],[9,10],[10,5],[10,6],[7,11],[11,8],[11,12],[12,8],[9,13],[13,14],[14,9],[14,10],[11,15],[15,12],[15,16],[16,12],[13,17],[17,18],[18,13],[18,14],[15,19],[19,16],[19,17],[17,16],[19,18]],
"face":[[0,1,2],[0,2,3],[0,3,4],[1,5,6],[1,6,2],[3,7,4],[4,7,8],[5,9,10],[5,10,6],[7,11,8],[8,11,12],[9,13,14],[9,14,10],[11,15,12],[12,15,16],[13,17,18],[13,18,14],[15,19,16],[16,19,17],[17,19,18],[0,4,8,12,16,17,13,9,5,1],[2,6,10,14,18,19,15,11,7,3]]}
}

},{}],47:[function(require,module,exports){
module.exports={
"TruncatedTetrahedron" : {
"name":"Truncated Tetrahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.105542],[0.8528029,0,0.7035265],[-0.7106691,0.4714045,0.7035265],[0.3316456,-0.7856742,0.7035265],[0.9949367,0.4714045,-0.1005038],[-1.089693,0.1571348,-0.1005038],[-0.5685352,0.942809,-0.1005038],[-0.04737794,-1.099944,-0.1005038],[0.6159132,0.1571348,-0.904534],[0.2842676,0.942809,-0.5025189],[-0.758047,-0.6285394,-0.5025189],[0.09475587,-0.6285394,-0.904534]],
"edge":[[0,3],[3,1],[1,0],[2,6],[6,5],[5,2],[4,8],[8,9],[9,4],[7,10],[10,11],[11,7],[1,4],[9,6],[2,0],[5,10],[7,3],[11,8]],
"face":[[0,3,1],[2,6,5],[4,8,9],[7,10,11],[0,1,4,9,6,2],[0,2,5,10,7,3],[1,3,7,11,8,4],[5,6,9,8,11,10]]},

"TruncatedCube" : {
"name":"Truncated Cube",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.042011],[0.5621693,0,0.8773552],[-0.4798415,0.2928932,0.8773552],[0.2569714,-0.5,0.8773552],[0.8773552,0.2928932,0.4798415],[-0.9014684,0.2071068,0.4798415],[-0.5962706,0.7071068,0.4798415],[0.1405423,-0.9142136,0.4798415],[1.017898,0.2071068,-0.08232778],[0.7609261,0.7071068,0.08232778],[-1.017898,-0.2071068,0.08232778],[-0.2810846,1,0.08232778],[-0.2810846,-1,0.08232778],[0.2810846,-1,-0.08232778],[0.9014684,-0.2071068,-0.4798415],[0.2810846,1,-0.08232778],[-0.7609261,-0.7071068,-0.08232778],[-0.8773552,-0.2928932,-0.4798415],[-0.1405423,0.9142136,-0.4798415],[0.5962706,-0.7071068,-0.4798415],[0.4798415,-0.2928932,-0.8773552],[-0.5621693,0,-0.8773552],[-0.2569714,0.5,-0.8773552],[0,0,-1.042011]],
"edge":[[0,3],[3,1],[1,0],[2,6],[6,5],[5,2],[4,8],[8,9],[9,4],[7,12],[12,13],[13,7],[10,17],[17,16],[16,10],[11,15],[15,18],[18,11],[14,19],[19,20],[20,14],[21,22],[22,23],[23,21],[1,4],[9,15],[11,6],[2,0],[5,10],[16,12],[7,3],[13,19],[14,8],[18,22],[21,17],[20,23]],
"face":[[0,3,1],[2,6,5],[4,8,9],[7,12,13],[10,17,16],[11,15,18],[14,19,20],[21,22,23],[0,1,4,9,15,11,6,2],[0,2,5,10,16,12,7,3],[1,3,7,13,19,14,8,4],[5,6,11,18,22,21,17,10],[8,14,20,23,22,18,15,9],[12,16,17,21,23,20,19,13]]},

"TruncatedOctahedron" : {
"name":"Truncated Octahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.054093],[0.6324555,0,0.843274],[-0.421637,0.4714045,0.843274],[-0.07027284,-0.6285394,0.843274],[0.843274,0.4714045,0.421637],[0.5621827,-0.6285394,0.6324555],[-0.9135469,0.3142697,0.421637],[-0.2108185,0.942809,0.421637],[-0.5621827,-0.7856742,0.421637],[0.9838197,0.3142697,-0.2108185],[0.421637,0.942809,0.2108185],[0.7027284,-0.7856742,0],[-0.7027284,0.7856742,0],[-0.9838197,-0.3142697,0.2108185],[-0.421637,-0.942809,-0.2108185],[0.5621827,0.7856742,-0.421637],[0.9135469,-0.3142697,-0.421637],[0.2108185,-0.942809,-0.421637],[-0.5621827,0.6285394,-0.6324555],[-0.843274,-0.4714045,-0.421637],[0.07027284,0.6285394,-0.843274],[0.421637,-0.4714045,-0.843274],[-0.6324555,0,-0.843274],[0,0,-1.054093]],
"edge":[[0,3],[3,5],[5,1],[1,0],[2,7],[7,12],[12,6],[6,2],[4,9],[9,15],[15,10],[10,4],[8,13],[13,19],[19,14],[14,8],[11,17],[17,21],[21,16],[16,11],[18,20],[20,23],[23,22],[22,18],[1,4],[10,7],[2,0],[6,13],[8,3],[5,11],[16,9],[14,17],[12,18],[22,19],[15,20],[21,23]],
"face":[[0,3,5,1],[2,7,12,6],[4,9,15,10],[8,13,19,14],[11,17,21,16],[18,20,23,22],[0,1,4,10,7,2],[0,2,6,13,8,3],[1,5,11,16,9,4],[3,8,14,17,11,5],[6,12,18,22,19,13],[7,10,15,20,18,12],[9,16,21,23,20,15],[14,19,22,23,21,17]]},

"TruncatedDodecahedron" : {
"name":"Truncated Dodecahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.014485],[0.3367628,0,0.9569589],[-0.2902233,0.1708204,0.9569589],[0.1634681,-0.2944272,0.9569589],[0.5914332,0.1708204,0.806354],[-0.5963465,0.1527864,0.806354],[-0.4230517,0.4472136,0.806354],[0.1377417,-0.6,0.806354],[0.8302037,0.1527864,0.5626702],[0.6667356,0.4472136,0.6201961],[-0.8014407,-0.0472136,0.6201961],[-0.3477493,0.7236068,0.6201961],[-0.06735256,-0.8,0.6201961],[0.2694102,-0.8,0.5626702],[0.9618722,-0.0472136,0.3189863],[0.5339072,0.7236068,0.4695912],[-0.8271671,-0.3527864,0.4695912],[-0.9599955,-0.0763932,0.3189863],[-0.3992021,0.8763932,0.3189863],[-0.09307895,0.8944272,0.4695912],[-0.3734757,-0.818034,0.4695912],[0.5081808,-0.818034,0.3189863],[0.9361459,-0.3527864,0.1683814],[1.011448,-0.0763932,-0.0177765],[0.4824544,0.8763932,0.1683814],[0.2436839,0.8944272,0.4120653],[-0.663699,-0.6472136,0.4120653],[-1.011448,0.0763932,0.0177765],[-0.5577569,0.8472136,0.0177765],[-0.5320305,-0.8472136,0.1683814],[0.5577569,-0.8472136,-0.0177765],[0.7628511,-0.6472136,0.1683814],[0.9599955,0.0763932,-0.3189863],[0.5320305,0.8472136,-0.1683814],[-0.9618722,0.0472136,-0.3189863],[-0.9361459,0.3527864,-0.1683814],[-0.7628511,0.6472136,-0.1683814],[-0.5081808,0.818034,-0.3189863],[-0.4824544,-0.8763932,-0.1683814],[0.3992021,-0.8763932,-0.3189863],[0.8014407,0.0472136,-0.6201961],[0.8271671,0.3527864,-0.4695912],[0.663699,0.6472136,-0.4120653],[0.3734757,0.818034,-0.4695912],[-0.8302037,-0.1527864,-0.5626702],[-0.2694102,0.8,-0.5626702],[-0.5339072,-0.7236068,-0.4695912],[-0.2436839,-0.8944272,-0.4120653],[0.09307895,-0.8944272,-0.4695912],[0.3477493,-0.7236068,-0.6201961],[0.5963465,-0.1527864,-0.806354],[0.06735256,0.8,-0.6201961],[-0.6667356,-0.4472136,-0.6201961],[-0.5914332,-0.1708204,-0.806354],[-0.1377417,0.6,-0.806354],[0.4230517,-0.4472136,-0.806354],[0.2902233,-0.1708204,-0.9569589],[-0.3367628,0,-0.9569589],[-0.1634681,0.2944272,-0.9569589],[0,0,-1.014485]],
"edge":[[0,3],[3,1],[1,0],[2,6],[6,5],[5,2],[4,8],[8,9],[9,4],[7,12],[12,13],[13,7],[10,17],[17,16],[16,10],[11,19],[19,18],[18,11],[14,22],[22,23],[23,14],[15,24],[24,25],[25,15],[20,26],[26,29],[29,20],[21,30],[30,31],[31,21],[27,35],[35,34],[34,27],[28,37],[37,36],[36,28],[32,40],[40,41],[41,32],[33,42],[42,43],[43,33],[38,46],[46,47],[47,38],[39,48],[48,49],[49,39],[44,53],[53,52],[52,44],[45,51],[51,54],[54,45],[50,55],[55,56],[56,50],[57,58],[58,59],[59,57],[1,4],[9,15],[25,19],[11,6],[2,0],[5,10],[16,26],[20,12],[7,3],[13,21],[31,22],[14,8],[18,28],[36,35],[27,17],[23,32],[41,42],[33,24],[29,38],[47,48],[39,30],[34,44],[52,46],[43,51],[45,37],[49,55],[50,40],[54,58],[57,53],[56,59]],
"face":[[0,3,1],[2,6,5],[4,8,9],[7,12,13],[10,17,16],[11,19,18],[14,22,23],[15,24,25],[20,26,29],[21,30,31],[27,35,34],[28,37,36],[32,40,41],[33,42,43],[38,46,47],[39,48,49],[44,53,52],[45,51,54],[50,55,56],[57,58,59],[0,1,4,9,15,25,19,11,6,2],[0,2,5,10,16,26,20,12,7,3],[1,3,7,13,21,31,22,14,8,4],[5,6,11,18,28,36,35,27,17,10],[8,14,23,32,41,42,33,24,15,9],[12,20,29,38,47,48,39,30,21,13],[16,17,27,34,44,52,46,38,29,26],[18,19,25,24,33,43,51,45,37,28],[22,31,30,39,49,55,50,40,32,23],[34,35,36,37,45,54,58,57,53,44],[40,50,56,59,58,54,51,43,42,41],[46,52,53,57,59,56,55,49,48,47]]},

"TruncatedIcosahedron" : {
"name":"Truncated Icosahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.021],[0.4035482,0,0.9378643],[-0.2274644,0.3333333,0.9378643],[-0.1471226,-0.375774,0.9378643],[0.579632,0.3333333,0.7715933],[0.5058321,-0.375774,0.8033483],[-0.6020514,0.2908927,0.7715933],[-0.05138057,0.6666667,0.7715933],[0.1654988,-0.6080151,0.8033483],[-0.5217096,-0.4182147,0.7715933],[0.8579998,0.2908927,0.4708062],[0.3521676,0.6666667,0.6884578],[0.7841999,-0.4182147,0.5025612],[-0.657475,0.5979962,0.5025612],[-0.749174,-0.08488134,0.6884578],[-0.3171418,0.8302373,0.5025612],[0.1035333,-0.8826969,0.5025612],[-0.5836751,-0.6928964,0.4708062],[0.8025761,0.5979962,0.2017741],[0.9602837,-0.08488134,0.3362902],[0.4899547,0.8302373,0.3362902],[0.7222343,-0.6928964,0.2017741],[-0.8600213,0.5293258,0.1503935],[-0.9517203,-0.1535518,0.3362902],[-0.1793548,0.993808,0.1503935],[0.381901,-0.9251375,0.2017741],[-0.2710537,-0.9251375,0.3362902],[-0.8494363,-0.5293258,0.2017741],[0.8494363,0.5293258,-0.2017741],[1.007144,-0.1535518,-0.06725804],[0.2241935,0.993808,0.06725804],[0.8600213,-0.5293258,-0.1503935],[-0.7222343,0.6928964,-0.2017741],[-1.007144,0.1535518,0.06725804],[-0.381901,0.9251375,-0.2017741],[0.1793548,-0.993808,-0.1503935],[-0.2241935,-0.993808,-0.06725804],[-0.8025761,-0.5979962,-0.2017741],[0.5836751,0.6928964,-0.4708062],[0.9517203,0.1535518,-0.3362902],[0.2710537,0.9251375,-0.3362902],[0.657475,-0.5979962,-0.5025612],[-0.7841999,0.4182147,-0.5025612],[-0.9602837,0.08488134,-0.3362902],[-0.1035333,0.8826969,-0.5025612],[0.3171418,-0.8302373,-0.5025612],[-0.4899547,-0.8302373,-0.3362902],[-0.8579998,-0.2908927,-0.4708062],[0.5217096,0.4182147,-0.7715933],[0.749174,0.08488134,-0.6884578],[0.6020514,-0.2908927,-0.7715933],[-0.5058321,0.375774,-0.8033483],[-0.1654988,0.6080151,-0.8033483],[0.05138057,-0.6666667,-0.7715933],[-0.3521676,-0.6666667,-0.6884578],[-0.579632,-0.3333333,-0.7715933],[0.1471226,0.375774,-0.9378643],[0.2274644,-0.3333333,-0.9378643],[-0.4035482,0,-0.9378643],[0,0,-1.021]],
"edge":[[0,3],[3,8],[8,5],[5,1],[1,0],[2,7],[7,15],[15,13],[13,6],[6,2],[4,10],[10,18],[18,20],[20,11],[11,4],[9,14],[14,23],[23,27],[27,17],[17,9],[12,21],[21,31],[31,29],[29,19],[19,12],[16,26],[26,36],[36,35],[35,25],[25,16],[22,32],[32,42],[42,43],[43,33],[33,22],[24,30],[30,40],[40,44],[44,34],[34,24],[28,39],[39,49],[49,48],[48,38],[38,28],[37,47],[47,55],[55,54],[54,46],[46,37],[41,45],[45,53],[53,57],[57,50],[50,41],[51,52],[52,56],[56,59],[59,58],[58,51],[1,4],[11,7],[2,0],[6,14],[9,3],[5,12],[19,10],[17,26],[16,8],[25,21],[13,22],[33,23],[20,30],[24,15],[29,39],[28,18],[34,32],[27,37],[46,36],[38,40],[35,45],[41,31],[43,47],[50,49],[44,52],[51,42],[54,53],[48,56],[58,55],[57,59]],
"face":[[0,3,8,5,1],[2,7,15,13,6],[4,10,18,20,11],[9,14,23,27,17],[12,21,31,29,19],[16,26,36,35,25],[22,32,42,43,33],[24,30,40,44,34],[28,39,49,48,38],[37,47,55,54,46],[41,45,53,57,50],[51,52,56,59,58],[0,1,4,11,7,2],[0,2,6,14,9,3],[1,5,12,19,10,4],[3,9,17,26,16,8],[5,8,16,25,21,12],[6,13,22,33,23,14],[7,11,20,30,24,15],[10,19,29,39,28,18],[13,15,24,34,32,22],[17,27,37,46,36,26],[18,28,38,40,30,20],[21,25,35,45,41,31],[23,33,43,47,37,27],[29,31,41,50,49,39],[32,34,44,52,51,42],[35,36,46,54,53,45],[38,48,56,52,44,40],[42,51,58,55,47,43],[48,49,50,57,59,56],[53,54,55,58,59,57]]},

"Cuboctahedron" : {
"name":"Cuboctahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.154701],[1,0,0.5773503],[0.3333333,0.942809,0.5773503],[-1,0,0.5773503],[-0.3333333,-0.942809,0.5773503],[1,0,-0.5773503],[0.6666667,-0.942809,0],[-0.6666667,0.942809,0],[0.3333333,0.942809,-0.5773503],[-1,0,-0.5773503],[-0.3333333,-0.942809,-0.5773503],[0,0,-1.154701]],
"edge":[[0,1],[1,2],[2,0],[0,3],[3,4],[4,0],[1,6],[6,5],[5,1],[2,8],[8,7],[7,2],[3,7],[7,9],[9,3],[4,10],[10,6],[6,4],[5,11],[11,8],[8,5],[9,11],[11,10],[10,9]],
"face":[[0,1,2],[0,3,4],[1,6,5],[2,8,7],[3,7,9],[4,10,6],[5,11,8],[9,11,10],[0,2,7,3],[0,4,6,1],[1,5,8,2],[3,9,10,4],[5,6,10,11],[7,8,11,9]]},

"TruncatedCubocahedron" : {
"name":"Truncated Cuboctahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.024117],[0.4314788,0,0.928785],[-0.02106287,0.4309644,0.928785],[-0.3410582,-0.2642977,0.928785],[0.4104159,0.4309644,0.833453],[0.7006238,-0.2642977,0.6986333],[-0.3831839,0.5976311,0.7381211],[-0.3919084,-0.6380712,0.6986333],[-0.7031792,-0.09763107,0.7381211],[0.6584981,0.5976311,0.5079694],[0.6497736,-0.6380712,0.4684816],[0.948706,-0.09763107,0.3731496],[-0.4638216,0.8333333,0.3731496],[-0.7242421,0.3333333,0.6427891],[-0.7540295,-0.4714045,0.5079694],[-0.1227634,-0.9023689,0.4684816],[0.5778604,0.8333333,0.1429979],[0.9276431,0.3333333,0.2778177],[0.8978557,-0.4714045,0.1429979],[0.3087154,-0.9023689,0.3731496],[-0.8048797,0.5690356,0.2778177],[-0.2157394,1,0.04766598],[-0.8470055,-0.5690356,0.08715377],[-0.2157394,-1,0.04766598],[0.8470055,0.5690356,-0.08715377],[0.2157394,1,-0.04766598],[0.8048797,-0.5690356,-0.2778177],[0.2157394,-1,-0.04766598],[-0.8978557,0.4714045,-0.1429979],[-0.3087154,0.9023689,-0.3731496],[-0.9276431,-0.3333333,-0.2778177],[-0.5778604,-0.8333333,-0.1429979],[0.7540295,0.4714045,-0.5079694],[0.1227634,0.9023689,-0.4684816],[0.7242421,-0.3333333,-0.6427891],[0.4638216,-0.8333333,-0.3731496],[-0.948706,0.09763107,-0.3731496],[-0.6497736,0.6380712,-0.4684816],[-0.6584981,-0.5976311,-0.5079694],[0.7031792,0.09763107,-0.7381211],[0.3919084,0.6380712,-0.6986333],[0.3831839,-0.5976311,-0.7381211],[-0.7006238,0.2642977,-0.6986333],[-0.4104159,-0.4309644,-0.833453],[0.3410582,0.2642977,-0.928785],[0.02106287,-0.4309644,-0.928785],[-0.4314788,0,-0.928785],[0,0,-1.024117]],
"edge":[[0,1],[1,4],[4,2],[2,0],[3,8],[8,14],[14,7],[7,3],[5,10],[10,18],[18,11],[11,5],[6,12],[12,20],[20,13],[13,6],[9,17],[17,24],[24,16],[16,9],[15,23],[23,27],[27,19],[19,15],[21,25],[25,33],[33,29],[29,21],[22,30],[30,38],[38,31],[31,22],[26,35],[35,41],[41,34],[34,26],[28,37],[37,42],[42,36],[36,28],[32,39],[39,44],[44,40],[40,32],[43,46],[46,47],[47,45],[45,43],[2,6],[13,8],[3,0],[1,5],[11,17],[9,4],[14,22],[31,23],[15,7],[10,19],[27,35],[26,18],[12,21],[29,37],[28,20],[24,32],[40,33],[25,16],[30,36],[42,46],[43,38],[41,45],[47,44],[39,34]],
"face":[[0,1,4,2],[3,8,14,7],[5,10,18,11],[6,12,20,13],[9,17,24,16],[15,23,27,19],[21,25,33,29],[22,30,38,31],[26,35,41,34],[28,37,42,36],[32,39,44,40],[43,46,47,45],[0,2,6,13,8,3],[1,5,11,17,9,4],[7,14,22,31,23,15],[10,19,27,35,26,18],[12,21,29,37,28,20],[16,24,32,40,33,25],[30,36,42,46,43,38],[34,41,45,47,44,39],[0,3,7,15,19,10,5,1],[2,4,9,16,25,21,12,6],[8,13,20,28,36,30,22,14],[11,18,26,34,39,32,24,17],[23,31,38,43,45,41,35,27],[29,33,40,44,47,46,42,37]]},

"Rhombicubocahedron" : {
"name":"Rhombicuboctahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.070722],[0.7148135,0,0.7971752],[-0.104682,0.7071068,0.7971752],[-0.6841528,0.2071068,0.7971752],[-0.104682,-0.7071068,0.7971752],[0.6101315,0.7071068,0.5236279],[1.04156,0.2071068,0.1367736],[0.6101315,-0.7071068,0.5236279],[-0.3574067,1,0.1367736],[-0.7888348,-0.5,0.5236279],[-0.9368776,0.5,0.1367736],[-0.3574067,-1,0.1367736],[0.3574067,1,-0.1367736],[0.9368776,-0.5,-0.1367736],[0.7888348,0.5,-0.5236279],[0.3574067,-1,-0.1367736],[-0.6101315,0.7071068,-0.5236279],[-1.04156,-0.2071068,-0.1367736],[-0.6101315,-0.7071068,-0.5236279],[0.104682,0.7071068,-0.7971752],[0.6841528,-0.2071068,-0.7971752],[0.104682,-0.7071068,-0.7971752],[-0.7148135,0,-0.7971752],[0,0,-1.070722]],
"edge":[[0,2],[2,3],[3,0],[1,6],[6,5],[5,1],[4,9],[9,11],[11,4],[7,15],[15,13],[13,7],[8,16],[16,10],[10,8],[12,14],[14,19],[19,12],[17,22],[22,18],[18,17],[20,21],[21,23],[23,20],[0,1],[5,2],[3,9],[4,0],[4,7],[7,1],[13,6],[5,12],[12,8],[8,2],[10,3],[10,17],[17,9],[11,15],[6,14],[13,20],[20,14],[19,16],[18,11],[16,22],[18,21],[21,15],[23,19],[23,22]],
"face":[[0,2,3],[1,6,5],[4,9,11],[7,15,13],[8,16,10],[12,14,19],[17,22,18],[20,21,23],[0,1,5,2],[0,3,9,4],[0,4,7,1],[1,7,13,6],[2,5,12,8],[2,8,10,3],[3,10,17,9],[4,11,15,7],[5,6,14,12],[6,13,20,14],[8,12,19,16],[9,17,18,11],[10,16,22,17],[11,18,21,15],[13,15,21,20],[14,20,23,19],[16,19,23,22],[18,22,23,21]]},

"SnubCuboctahedron" : {
"name":"Snub Cuboctahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.077364],[0.7442063,0,0.7790187],[0.3123013,0.6755079,0.7790187],[-0.482096,0.5669449,0.7790187],[-0.7169181,-0.1996786,0.7790187],[-0.1196038,-0.7345325,0.7790187],[0.6246025,-0.7345325,0.4806734],[1.056508,-0.1996786,0.06806912],[0.8867128,0.5669449,0.2302762],[0.2621103,1.042774,0.06806912],[-0.532287,0.9342111,0.06806912],[-1.006317,0.3082417,0.2302762],[-0.7020817,-0.784071,0.2302762],[0.02728827,-1.074865,0.06806912],[0.6667271,-0.784071,-0.3184664],[0.8216855,-0.09111555,-0.6908285],[0.6518908,0.6755079,-0.5286215],[-0.1196038,0.8751866,-0.6168117],[-0.8092336,0.4758293,-0.5286215],[-0.9914803,-0.2761507,-0.3184664],[-0.4467414,-0.825648,-0.5286215],[0.1926974,-0.5348539,-0.915157],[0.1846311,0.2587032,-1.029416],[-0.5049987,-0.1406541,-0.9412258]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[4,5],[5,0],[1,6],[6,7],[7,1],[7,8],[8,1],[8,2],[8,9],[9,2],[3,10],[10,11],[11,3],[11,4],[4,12],[12,5],[12,13],[13,5],[13,6],[6,5],[13,14],[14,6],[14,7],[14,15],[15,7],[8,16],[16,9],[16,17],[17,9],[17,10],[10,9],[17,18],[18,10],[18,11],[18,19],[19,11],[12,19],[19,20],[20,12],[20,13],[14,21],[21,15],[21,22],[22,15],[22,16],[16,15],[22,17],[18,23],[23,19],[23,20],[23,21],[21,20],[23,22]],
"face":[[0,1,2],[0,2,3],[0,3,4],[0,4,5],[1,6,7],[1,7,8],[1,8,2],[2,8,9],[3,10,11],[3,11,4],[4,12,5],[5,12,13],[5,13,6],[6,13,14],[6,14,7],[7,14,15],[8,16,9],[9,16,17],[9,17,10],[10,17,18],[10,18,11],[11,18,19],[12,19,20],[12,20,13],[14,21,15],[15,21,22],[15,22,16],[16,22,17],[18,23,19],[19,23,20],[20,23,21],[21,23,22],[0,5,6,1],[2,9,10,3],[4,11,19,12],[7,15,16,8],[13,20,21,14],[17,22,23,18]]},

"Icosidodecahedron" : {
"name":"Icosidodecahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.051462],[0.618034,0,0.8506508],[0.2763932,0.5527864,0.8506508],[-0.618034,0,0.8506508],[-0.2763932,-0.5527864,0.8506508],[1,0,0.3249197],[0.7236068,-0.5527864,0.5257311],[-0.1708204,0.8944272,0.5257311],[0.4472136,0.8944272,0.3249197],[-1,0,0.3249197],[-0.7236068,0.5527864,0.5257311],[0.1708204,-0.8944272,0.5257311],[-0.4472136,-0.8944272,0.3249197],[1,0,-0.3249197],[0.8944272,0.5527864,0],[0.5527864,-0.8944272,0],[-0.5527864,0.8944272,0],[0.4472136,0.8944272,-0.3249197],[-1,0,-0.3249197],[-0.8944272,-0.5527864,0],[-0.4472136,-0.8944272,-0.3249197],[0.618034,0,-0.8506508],[0.7236068,-0.5527864,-0.5257311],[0.1708204,-0.8944272,-0.5257311],[-0.7236068,0.5527864,-0.5257311],[-0.1708204,0.8944272,-0.5257311],[0.2763932,0.5527864,-0.8506508],[-0.618034,0,-0.8506508],[-0.2763932,-0.5527864,-0.8506508],[0,0,-1.051462]],
"edge":[[0,1],[1,2],[2,0],[0,3],[3,4],[4,0],[1,6],[6,5],[5,1],[2,8],[8,7],[7,2],[3,10],[10,9],[9,3],[4,12],[12,11],[11,4],[5,13],[13,14],[14,5],[6,11],[11,15],[15,6],[7,16],[16,10],[10,7],[8,14],[14,17],[17,8],[9,18],[18,19],[19,9],[12,19],[19,20],[20,12],[13,22],[22,21],[21,13],[15,23],[23,22],[22,15],[16,25],[25,24],[24,16],[17,26],[26,25],[25,17],[18,24],[24,27],[27,18],[20,28],[28,23],[23,20],[21,29],[29,26],[26,21],[27,29],[29,28],[28,27]],
"face":[[0,1,2],[0,3,4],[1,6,5],[2,8,7],[3,10,9],[4,12,11],[5,13,14],[6,11,15],[7,16,10],[8,14,17],[9,18,19],[12,19,20],[13,22,21],[15,23,22],[16,25,24],[17,26,25],[18,24,27],[20,28,23],[21,29,26],[27,29,28],[0,2,7,10,3],[0,4,11,6,1],[1,5,14,8,2],[3,9,19,12,4],[5,6,15,22,13],[7,8,17,25,16],[9,10,16,24,18],[11,12,20,23,15],[13,21,26,17,14],[18,27,28,20,19],[21,22,23,28,29],[24,25,26,29,27]]},

"TruncatedIcosidodecahedron" : {
"name":"Truncated Icosidodecahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.008759],[0.2629922,0,0.973874],[-0.00462747,0.2629515,0.973874],[-0.2211363,-0.1423503,0.973874],[0.2583647,0.2629515,0.9389886],[0.4673861,-0.1423503,0.8825429],[-0.2303913,0.3835526,0.9041033],[-0.3159502,-0.372678,0.8825429],[-0.4469001,-0.02174919,0.9041033],[0.4581312,0.3835526,0.8127722],[0.5351104,-0.372678,0.7696515],[0.6671526,-0.02174919,0.7563265],[-0.3326926,0.5786893,0.7563265],[-0.4515276,0.2412023,0.8692179],[-0.541714,-0.2520769,0.8127722],[-0.248226,-0.6030057,0.7696515],[0.518368,0.5786893,0.6434351],[0.6625252,0.2412023,0.7214412],[0.7348768,-0.2520769,0.6434351],[0.4402965,-0.6030057,0.6783205],[-0.5538289,0.436339,0.7214412],[-0.2724557,0.7738261,0.5869894],[-0.6997536,-0.3618034,0.6301101],[-0.04383203,-0.745356,0.6783205],[-0.4062656,-0.7127322,0.5869894],[0.722762,0.436339,0.552104],[0.4160667,0.7738261,0.4956583],[0.8398294,-0.3618034,0.4258876],[0.2191601,-0.745356,0.6434351],[0.5452491,-0.7127322,0.460773],[-0.7147284,0.4891254,0.5172187],[-0.07268925,0.8944272,0.460773],[-0.4333553,0.8266125,0.3827669],[-0.8606531,-0.309017,0.4258876],[-0.6320294,-0.5921311,0.5172187],[-0.2018716,-0.8550825,0.4956583],[0.8248546,0.4891254,0.3129962],[0.1903029,0.8944272,0.4258876],[0.5181594,0.8266125,0.2565505],[0.9419221,-0.309017,0.1867798],[0.7450156,-0.5921311,0.3345566],[0.3241127,-0.8550825,0.4258876],[-0.8727679,0.3793989,0.3345566],[-0.6544916,0.6842621,0.3478816],[-0.2335888,0.9472136,0.2565505],[-0.7929289,-0.5393447,0.3129962],[-0.9629544,-0.1138803,0.2781109],[-0.096919,-0.9648091,0.2781109],[0.9298072,0.3793989,0.09544872],[0.7225533,0.6842621,0.1652194],[0.2923956,0.9472136,0.1867798],[0.8471082,-0.5393447,0.09544872],[1.002159,-0.1138803,0.01744268],[0.1660732,-0.9648091,0.2432255],[-0.8125311,0.5745356,0.1652194],[-0.9675818,0.1490712,0.2432255],[-0.1314961,1,0.01744268],[-0.8275059,-0.5745356,0.05232804],[-0.9975315,-0.1490712,0.01744268],[-0.1314961,-1,0.01744268],[0.8275059,0.5745356,-0.05232804],[0.9975315,0.1490712,-0.01744268],[0.1314961,1,-0.01744268],[0.8125311,-0.5745356,-0.1652194],[0.9675818,-0.1490712,-0.2432255],[0.1314961,-1,-0.01744268],[-0.8471082,0.5393447,-0.09544872],[-1.002159,0.1138803,-0.01744268],[-0.1660732,0.9648091,-0.2432255],[-0.7225533,-0.6842621,-0.1652194],[-0.9298072,-0.3793989,-0.09544872],[-0.2923956,-0.9472136,-0.1867798],[0.7929289,0.5393447,-0.3129962],[0.9629544,0.1138803,-0.2781109],[0.096919,0.9648091,-0.2781109],[0.6544916,-0.6842621,-0.3478816],[0.8727679,-0.3793989,-0.3345566],[0.2335888,-0.9472136,-0.2565505],[-0.7450156,0.5921311,-0.3345566],[-0.9419221,0.309017,-0.1867798],[-0.3241127,0.8550825,-0.4258876],[-0.8248546,-0.4891254,-0.3129962],[-0.5181594,-0.8266125,-0.2565505],[-0.1903029,-0.8944272,-0.4258876],[0.6320294,0.5921311,-0.5172187],[0.8606531,0.309017,-0.4258876],[0.2018716,0.8550825,-0.4956583],[0.7147284,-0.4891254,-0.5172187],[0.4333553,-0.8266125,-0.3827669],[0.07268925,-0.8944272,-0.460773],[-0.8398294,0.3618034,-0.4258876],[-0.5452491,0.7127322,-0.460773],[-0.2191601,0.745356,-0.6434351],[-0.722762,-0.436339,-0.552104],[-0.4160667,-0.7738261,-0.4956583],[0.6997536,0.3618034,-0.6301101],[0.4062656,0.7127322,-0.5869894],[0.04383203,0.745356,-0.6783205],[0.5538289,-0.436339,-0.7214412],[0.2724557,-0.7738261,-0.5869894],[-0.7348768,0.2520769,-0.6434351],[-0.4402965,0.6030057,-0.6783205],[-0.6625252,-0.2412023,-0.7214412],[-0.518368,-0.5786893,-0.6434351],[0.541714,0.2520769,-0.8127722],[0.248226,0.6030057,-0.7696515],[0.4515276,-0.2412023,-0.8692179],[0.3326926,-0.5786893,-0.7563265],[-0.6671526,0.02174919,-0.7563265],[-0.5351104,0.372678,-0.7696515],[-0.4581312,-0.3835526,-0.8127722],[0.4469001,0.02174919,-0.9041033],[0.3159502,0.372678,-0.8825429],[0.2303913,-0.3835526,-0.9041033],[-0.4673861,0.1423503,-0.8825429],[-0.2583647,-0.2629515,-0.9389886],[0.2211363,0.1423503,-0.973874],[0.00462747,-0.2629515,-0.973874],[-0.2629922,0,-0.973874],[0,0,-1.008759]],
"edge":[[0,1],[1,4],[4,2],[2,0],[3,8],[8,14],[14,7],[7,3],[5,10],[10,18],[18,11],[11,5],[6,12],[12,20],[20,13],[13,6],[9,17],[17,25],[25,16],[16,9],[15,24],[24,35],[35,23],[23,15],[19,28],[28,41],[41,29],[29,19],[21,31],[31,44],[44,32],[32,21],[22,33],[33,45],[45,34],[34,22],[26,38],[38,50],[50,37],[37,26],[27,40],[40,51],[51,39],[39,27],[30,43],[43,54],[54,42],[42,30],[36,48],[48,60],[60,49],[49,36],[46,55],[55,67],[67,58],[58,46],[47,59],[59,65],[65,53],[53,47],[52,64],[64,73],[73,61],[61,52],[56,62],[62,74],[74,68],[68,56],[57,70],[70,81],[81,69],[69,57],[63,75],[75,87],[87,76],[76,63],[66,78],[78,90],[90,79],[79,66],[71,82],[82,94],[94,83],[83,71],[72,85],[85,95],[95,84],[84,72],[77,89],[89,99],[99,88],[88,77],[80,92],[92,101],[101,91],[91,80],[86,96],[96,105],[105,97],[97,86],[93,102],[102,110],[110,103],[103,93],[98,107],[107,113],[113,106],[106,98],[100,109],[109,114],[114,108],[108,100],[104,111],[111,116],[116,112],[112,104],[115,118],[118,119],[119,117],[117,115],[2,6],[13,8],[3,0],[1,5],[11,17],[9,4],[14,22],[34,24],[15,7],[10,19],[29,40],[27,18],[12,21],[32,43],[30,20],[25,36],[49,38],[26,16],[35,47],[53,41],[28,23],[31,37],[50,62],[56,44],[33,46],[58,70],[57,45],[51,63],[76,64],[52,39],[54,66],[79,67],[55,42],[48,61],[73,85],[72,60],[59,71],[83,89],[77,65],[74,86],[97,92],[80,68],[81,93],[103,94],[82,69],[75,88],[99,107],[98,87],[78,91],[101,109],[100,90],[95,104],[112,105],[96,84],[102,108],[114,118],[115,110],[113,117],[119,116],[111,106]],
"face":[[0,1,4,2],[3,8,14,7],[5,10,18,11],[6,12,20,13],[9,17,25,16],[15,24,35,23],[19,28,41,29],[21,31,44,32],[22,33,45,34],[26,38,50,37],[27,40,51,39],[30,43,54,42],[36,48,60,49],[46,55,67,58],[47,59,65,53],[52,64,73,61],[56,62,74,68],[57,70,81,69],[63,75,87,76],[66,78,90,79],[71,82,94,83],[72,85,95,84],[77,89,99,88],[80,92,101,91],[86,96,105,97],[93,102,110,103],[98,107,113,106],[100,109,114,108],[104,111,116,112],[115,118,119,117],[0,2,6,13,8,3],[1,5,11,17,9,4],[7,14,22,34,24,15],[10,19,29,40,27,18],[12,21,32,43,30,20],[16,25,36,49,38,26],[23,35,47,53,41,28],[31,37,50,62,56,44],[33,46,58,70,57,45],[39,51,63,76,64,52],[42,54,66,79,67,55],[48,61,73,85,72,60],[59,71,83,89,77,65],[68,74,86,97,92,80],[69,81,93,103,94,82],[75,88,99,107,98,87],[78,91,101,109,100,90],[84,95,104,112,105,96],[102,108,114,118,115,110],[106,113,117,119,116,111],[0,3,7,15,23,28,19,10,5,1],[2,4,9,16,26,37,31,21,12,6],[8,13,20,30,42,55,46,33,22,14],[11,18,27,39,52,61,48,36,25,17],[24,34,45,57,69,82,71,59,47,35],[29,41,53,65,77,88,75,63,51,40],[32,44,56,68,80,91,78,66,54,43],[38,49,60,72,84,96,86,74,62,50],[58,67,79,90,100,108,102,93,81,70],[64,76,87,98,106,111,104,95,85,73],[83,94,103,110,115,117,113,107,99,89],[92,97,105,112,116,119,118,114,109,101]]},

"Rhombicosidodecahedron" : {
"name":"Rhombicosidodecahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.026054],[0.447838,0,0.9231617],[-0.02363976,0.4472136,0.9231617],[-0.4050732,0.190983,0.9231617],[-0.1693344,-0.4145898,0.9231617],[0.4241982,0.4472136,0.8202696],[0.7673818,0.190983,0.6537868],[0.5552827,-0.4145898,0.7566788],[-0.2312241,0.7562306,0.6537868],[-0.5744076,-0.2236068,0.8202696],[-0.6126576,0.5,0.6537868],[0.1738492,-0.6708204,0.7566788],[-0.4669629,-0.6381966,0.6537868],[0.493393,0.7562306,0.4873039],[0.8748265,-0.2236068,0.4873039],[0.8365765,0.5,0.320821],[0.7054921,-0.6381966,0.3844118],[0.08831973,0.9472136,0.3844118],[-0.5434628,0.809017,0.320821],[-0.8866463,-0.1708204,0.4873039],[-0.9102861,0.2763932,0.3844118],[-0.1237794,-0.8944272,0.4873039],[0.3240586,-0.8944272,0.3844118],[-0.7792016,-0.5854102,0.320821],[0.6289922,0.809017,0.05144604],[1.010426,-0.1708204,0.05144604],[0.9867859,0.2763932,-0.05144604],[0.8410913,-0.5854102,-0.05144604],[-0.223919,1,0.05144604],[0.223919,1,-0.05144604],[-0.8410913,0.5854102,0.05144604],[-0.9867859,-0.2763932,0.05144604],[-1.010426,0.1708204,-0.05144604],[-0.223919,-1,0.05144604],[0.223919,-1,-0.05144604],[-0.6289922,-0.809017,-0.05144604],[0.7792016,0.5854102,-0.320821],[0.9102861,-0.2763932,-0.3844118],[0.8866463,0.1708204,-0.4873039],[0.5434628,-0.809017,-0.320821],[-0.3240586,0.8944272,-0.3844118],[0.1237794,0.8944272,-0.4873039],[-0.7054921,0.6381966,-0.3844118],[-0.8365765,-0.5,-0.320821],[-0.8748265,0.2236068,-0.4873039],[-0.08831973,-0.9472136,-0.3844118],[-0.493393,-0.7562306,-0.4873039],[0.4669629,0.6381966,-0.6537868],[0.6126576,-0.5,-0.6537868],[0.5744076,0.2236068,-0.8202696],[0.2312241,-0.7562306,-0.6537868],[-0.1738492,0.6708204,-0.7566788],[-0.5552827,0.4145898,-0.7566788],[-0.7673818,-0.190983,-0.6537868],[-0.4241982,-0.4472136,-0.8202696],[0.1693344,0.4145898,-0.9231617],[0.4050732,-0.190983,-0.9231617],[0.02363976,-0.4472136,-0.9231617],[-0.447838,0,-0.9231617],[0,0,-1.026054]],
"edge":[[0,2],[2,3],[3,0],[1,6],[6,5],[5,1],[4,9],[9,12],[12,4],[7,16],[16,14],[14,7],[8,18],[18,10],[10,8],[11,21],[21,22],[22,11],[13,15],[15,24],[24,13],[17,29],[29,28],[28,17],[19,31],[31,23],[23,19],[20,30],[30,32],[32,20],[25,27],[27,37],[37,25],[26,38],[38,36],[36,26],[33,45],[45,34],[34,33],[35,43],[43,46],[46,35],[39,50],[50,48],[48,39],[40,41],[41,51],[51,40],[42,52],[52,44],[44,42],[47,49],[49,55],[55,47],[53,58],[58,54],[54,53],[56,57],[57,59],[59,56],[0,1],[5,2],[3,9],[4,0],[1,7],[14,6],[2,8],[10,3],[12,21],[11,4],[6,15],[13,5],[7,11],[22,16],[8,17],[28,18],[9,19],[23,12],[18,30],[20,10],[24,29],[17,13],[16,27],[25,14],[15,26],[36,24],[19,20],[32,31],[21,33],[34,22],[31,43],[35,23],[37,38],[26,25],[27,39],[48,37],[29,41],[40,28],[30,42],[44,32],[33,35],[46,45],[45,50],[39,34],[38,49],[47,36],[51,52],[42,40],[41,47],[55,51],[43,53],[54,46],[52,58],[53,44],[50,57],[56,48],[49,56],[59,55],[58,59],[57,54]],
"face":[[0,2,3],[1,6,5],[4,9,12],[7,16,14],[8,18,10],[11,21,22],[13,15,24],[17,29,28],[19,31,23],[20,30,32],[25,27,37],[26,38,36],[33,45,34],[35,43,46],[39,50,48],[40,41,51],[42,52,44],[47,49,55],[53,58,54],[56,57,59],[0,1,5,2],[0,3,9,4],[1,7,14,6],[2,8,10,3],[4,12,21,11],[5,6,15,13],[7,11,22,16],[8,17,28,18],[9,19,23,12],[10,18,30,20],[13,24,29,17],[14,16,27,25],[15,26,36,24],[19,20,32,31],[21,33,34,22],[23,31,43,35],[25,37,38,26],[27,39,48,37],[28,29,41,40],[30,42,44,32],[33,35,46,45],[34,45,50,39],[36,38,49,47],[40,51,52,42],[41,47,55,51],[43,53,54,46],[44,52,58,53],[48,50,57,56],[49,56,59,55],[54,58,59,57],[0,4,11,7,1],[2,5,13,17,8],[3,10,20,19,9],[6,14,25,26,15],[12,23,35,33,21],[16,22,34,39,27],[18,28,40,42,30],[24,36,47,41,29],[31,32,44,53,43],[37,48,56,49,38],[45,46,54,57,50],[51,55,59,58,52]]},

"SnubIcosidodecahedron" : {
"name":"Snub Icosidodecahedron",
"category":["Archimedean Solid"],
"vertex":[[0,0,1.028031],[0.4638569,0,0.9174342],[0.2187436,0.4090409,0.9174342],[-0.2575486,0.3857874,0.9174342],[-0.4616509,-0.04518499,0.9174342],[-0.177858,-0.4284037,0.9174342],[0.5726782,-0.4284037,0.7384841],[0.8259401,-0.04518499,0.6104342],[0.6437955,0.3857874,0.702527],[0.349648,0.7496433,0.6104342],[-0.421009,0.7120184,0.6104342],[-0.6783139,0.3212396,0.702527],[-0.6031536,-0.4466658,0.702527],[-0.2749612,-0.7801379,0.6104342],[0.1760766,-0.6931717,0.7384841],[0.5208138,-0.7801379,0.4206978],[0.8552518,-0.4466658,0.3547998],[1.01294,-0.03548596,0.1718776],[0.7182239,0.661842,0.3208868],[0.3633691,0.9454568,0.1758496],[-0.04574087,0.9368937,0.4206978],[-0.4537394,0.905564,0.1758496],[-0.7792791,0.5887312,0.3208868],[-0.9537217,0.1462217,0.3547998],[-0.9072701,-0.3283699,0.3547998],[-0.6503371,-0.7286577,0.3208868],[0.08459482,-0.9611501,0.3547998],[0.3949153,-0.9491262,-0.007072558],[0.9360473,-0.409557,-0.1136978],[0.9829382,0.02692292,-0.2999274],[0.9463677,0.4014808,-0.007072558],[0.6704578,0.7662826,-0.1419366],[-0.05007646,1.025698,-0.04779978],[-0.4294337,0.8845784,-0.2999274],[-0.9561681,0.3719321,-0.06525234],[-1.022036,-0.1000338,-0.04779978],[-0.8659056,-0.5502712,-0.06525234],[-0.5227761,-0.8778535,-0.1136978],[-0.06856319,-1.021542,-0.09273844],[0.2232046,-0.8974878,-0.4489366],[0.6515438,-0.7200947,-0.3373472],[0.7969535,-0.3253959,-0.5619888],[0.8066872,0.4395354,-0.461425],[0.4468035,0.735788,-0.5619888],[0.001488801,0.8961155,-0.503809],[-0.3535403,0.6537658,-0.7102452],[-0.7399517,0.5547758,-0.4489366],[-0.9120238,0.1102196,-0.461425],[-0.6593998,-0.6182798,-0.4896639],[-0.2490651,-0.8608088,-0.503809],[0.4301047,-0.5764987,-0.734512],[0.5057577,-0.1305283,-0.8854492],[0.5117735,0.3422252,-0.8232973],[0.09739587,0.5771941,-0.8451093],[-0.6018946,0.2552591,-0.7933564],[-0.6879024,-0.2100741,-0.734512],[-0.3340437,-0.5171509,-0.8232973],[0.08570633,-0.3414376,-0.9658797],[0.1277354,0.1313635,-1.011571],[-0.3044499,-0.06760332,-0.979586]],
"edge":[[0,1],[1,2],[2,0],[2,3],[3,0],[3,4],[4,0],[4,5],[5,0],[1,6],[6,7],[7,1],[7,8],[8,1],[8,2],[8,9],[9,2],[3,10],[10,11],[11,3],[11,4],[4,12],[12,5],[12,13],[13,5],[13,14],[14,5],[6,14],[14,15],[15,6],[15,16],[16,6],[16,7],[16,17],[17,7],[8,18],[18,9],[18,19],[19,9],[19,20],[20,9],[10,20],[20,21],[21,10],[21,22],[22,10],[22,11],[22,23],[23,11],[12,24],[24,25],[25,12],[25,13],[13,26],[26,14],[26,15],[26,27],[27,15],[16,28],[28,17],[28,29],[29,17],[29,30],[30,17],[18,30],[30,31],[31,18],[31,19],[19,32],[32,20],[32,21],[32,33],[33,21],[22,34],[34,23],[34,35],[35,23],[35,24],[24,23],[35,36],[36,24],[36,25],[36,37],[37,25],[26,38],[38,27],[38,39],[39,27],[39,40],[40,27],[28,40],[40,41],[41,28],[41,29],[29,42],[42,30],[42,31],[42,43],[43,31],[32,44],[44,33],[44,45],[45,33],[45,46],[46,33],[34,46],[46,47],[47,34],[47,35],[36,48],[48,37],[48,49],[49,37],[49,38],[38,37],[49,39],[39,50],[50,40],[50,41],[50,51],[51,41],[42,52],[52,43],[52,53],[53,43],[53,44],[44,43],[53,45],[45,54],[54,46],[54,47],[54,55],[55,47],[48,55],[55,56],[56,48],[56,49],[50,57],[57,51],[57,58],[58,51],[58,52],[52,51],[58,53],[54,59],[59,55],[59,56],[59,57],[57,56],[59,58]],
"face":[[0,1,2],[0,2,3],[0,3,4],[0,4,5],[1,6,7],[1,7,8],[1,8,2],[2,8,9],[3,10,11],[3,11,4],[4,12,5],[5,12,13],[5,13,14],[6,14,15],[6,15,16],[6,16,7],[7,16,17],[8,18,9],[9,18,19],[9,19,20],[10,20,21],[10,21,22],[10,22,11],[11,22,23],[12,24,25],[12,25,13],[13,26,14],[14,26,15],[15,26,27],[16,28,17],[17,28,29],[17,29,30],[18,30,31],[18,31,19],[19,32,20],[20,32,21],[21,32,33],[22,34,23],[23,34,35],[23,35,24],[24,35,36],[24,36,25],[25,36,37],[26,38,27],[27,38,39],[27,39,40],[28,40,41],[28,41,29],[29,42,30],[30,42,31],[31,42,43],[32,44,33],[33,44,45],[33,45,46],[34,46,47],[34,47,35],[36,48,37],[37,48,49],[37,49,38],[38,49,39],[39,50,40],[40,50,41],[41,50,51],[42,52,43],[43,52,53],[43,53,44],[44,53,45],[45,54,46],[46,54,47],[47,54,55],[48,55,56],[48,56,49],[50,57,51],[51,57,58],[51,58,52],[52,58,53],[54,59,55],[55,59,56],[56,59,57],[57,59,58],[0,5,14,6,1],[2,9,20,10,3],[4,11,23,24,12],[7,17,30,18,8],[13,25,37,38,26],[15,27,40,28,16],[19,31,43,44,32],[21,33,46,34,22],[29,41,51,52,42],[35,47,55,48,36],[39,49,56,57,50],[45,53,58,59,54]]}
}

},{}],48:[function(require,module,exports){
module.exports={
"J1" : {
"name":"Square Pyramid (J1)",
"category":["Johnson Solid"],
"vertex":[[-0.729665,0.670121,0.319155],[-0.655235,-0.29213,-0.754096],[-0.093922,-0.607123,0.537818],[0.702196,0.595691,0.485187],[0.776626,-0.36656,-0.588064]],
"edge":[[4,1],[1,0],[0,3],[3,4],[4,2],[2,1],[2,0],[2,3]],
"face":[[1,4,2],[0,1,2],[3,0,2],[4,3,2],[4,1,0,3]] },

"J2" : {
"name":"Pentagonal Pyramid (J2)",
"category":["Johnson Solid"],
"vertex":[[-0.868849,-0.100041,0.61257],[-0.329458,0.976099,0.28078],[-0.26629,-0.013796,-0.477654],[-0.13392,-1.034115,0.229829],[0.738834,0.707117,-0.307018],[0.859683,-0.535264,-0.338508]],
"edge":[[0,3],[3,5],[5,4],[4,1],[1,0],[0,2],[2,3],[2,5],[2,4],[2,1]],
"face":[[3,0,2],[5,3,2],[4,5,2],[1,4,2],[0,1,2],[0,3,5,4,1]]},

"J3" : {
"name":"Triangular Cupola (J3)",
"category":["Johnson Solid"],
"vertex":[[-0.909743,0.523083,0.242386],[-0.747863,0.22787,-0.740794],[-0.678803,-0.467344,0.028562],[-0.11453,0.564337,0.910169],[0.11641,-0.426091,0.696344],[0.209231,-0.02609,-1.056192],[0.278291,-0.721304,-0.286836],[0.842564,0.310377,0.594771],[1.004444,0.015163,-0.38841]],
"edge":[[0,3],[3,7],[7,8],[8,5],[5,1],[1,0],[2,6],[6,4],[4,2],[2,1],[5,6],[8,6],[7,4],[3,4],[0,2]],
"face":[[2,6,4],[6,5,8],[4,7,3],[2,0,1],[6,2,1,5],[4,6,8,7],[2,4,3,0],[0,3,7,8,5,1]]},

"J4" : {
"name":"Square Cupola (J4)",
"category":["Johnson Solid"],
"vertex":[[-0.600135,0.398265,-0.852158],[-0.585543,-0.441941,-0.840701],[-0.584691,0.40999,-0.011971],[-0.570099,-0.430216,-0.000514],[-0.18266,1.005432,-0.447988],[-0.147431,-1.023005,-0.420329],[0.0203,0.428447,0.571068],[0.034892,-0.411759,0.582525],[0.422331,1.023889,0.135052],[0.457559,-1.004548,0.162711],[0.860442,0.442825,0.555424],[0.875034,-0.397381,0.566881]],
"edge":[[4,8],[8,10],[10,11],[11,9],[9,5],[5,1],[1,0],[0,4],[2,3],[3,7],[7,6],[6,2],[2,0],[1,3],[5,3],[9,7],[11,7],[10,6],[8,6],[4,2]],
"face":[[3,1,5],[7,9,11],[6,10,8],[2,4,0],[2,3,7,6],[3,2,0,1],[7,3,5,9],[6,7,11,10],[2,6,8,4],[4,8,10,11,9,5,1,0]]},

"J5" : {
"name":"Pentagonal Cupola (J5)",
"category":["Johnson Solid"],
"vertex":[[-0.973114,0.120196,-0.57615],[-0.844191,-0.563656,-0.512814],[-0.711039,0.75783,-0.46202],[-0.594483,0.244733,-0.002202],[-0.46556,-0.439119,0.061133],[-0.373515,-1.032518,-0.296206],[-0.15807,1.105692,-0.21402],[-0.041514,0.592595,0.245798],[0.167087,-0.513901,0.348277],[0.259132,-1.1073,-0.009062],[0.429162,0.123733,0.462406],[0.474577,1.03091,0.073124],[0.812101,-0.759438,0.238938],[0.945253,0.562048,0.289732],[1.074175,-0.121804,0.353067]],
"edge":[[2,6],[6,11],[11,13],[13,14],[14,12],[12,9],[9,5],[5,1],[1,0],[0,2],[3,4],[4,8],[8,10],[10,7],[7,3],[3,0],[1,4],[5,4],[9,8],[12,8],[14,10],[13,10],[11,7],[6,7],[2,3]],
"face":[[4,1,5],[8,9,12],[10,14,13],[7,11,6],[3,2,0],[4,3,0,1],[8,4,5,9],[10,8,12,14],[7,10,13,11],[3,7,6,2],[3,4,8,10,7],[2,6,11,13,14,12,9,5,1,0]]},

"J6" : {
"name":"Pentagonal Rotunda (J6)",
"category":["Johnson Solid"],
"vertex":[[-0.905691,-0.396105,-0.539844],[-0.883472,-0.258791,0.103519],[-0.719735,-0.859265,-0.110695],[-0.703659,0.13708,-0.868724],[-0.667708,0.359259,0.17226],[-0.556577,0.60392,-0.428619],[-0.481752,-0.103901,0.60141],[-0.21682,-1.075487,0.254804],[-0.190808,0.536633,-0.971712],[-0.154857,0.758811,0.069272],[-0.069738,-0.608646,0.694909],[0.146026,0.009404,0.76365],[0.348059,0.542589,0.434771],[0.410958,-0.962182,0.417045],[0.436971,0.649937,-0.809472],[0.45919,0.787251,-0.166109],[0.760072,0.037844,0.52827],[0.923809,-0.562629,0.314056],[0.939886,0.433715,-0.443973],[1.125842,-0.029444,-0.014823]],
"edge":[[2,0],[0,3],[3,8],[8,14],[14,18],[18,19],[19,17],[17,13],[13,7],[7,2],[11,12],[12,9],[9,4],[4,6],[6,11],[11,10],[10,13],[17,16],[16,11],[16,12],[19,16],[18,15],[15,12],[15,9],[14,15],[8,5],[5,9],[5,4],[3,5],[0,1],[1,4],[1,6],[2,1],[7,10],[10,6]],
"face":[[11,16,12],[16,17,19],[12,15,9],[15,18,14],[9,5,4],[5,8,3],[4,1,6],[1,0,2],[6,10,11],[10,7,13],[11,12,9,4,6],[11,10,13,17,16],[12,16,19,18,15],[9,15,14,8,5],[4,5,3,0,1],[6,1,2,7,10],[2,0,3,8,14,18,19,17,13,7]]},

"J7" : {
"name":"Elongated Triangular Pyramid (J7)",
"category":["Johnson Solid"],
"vertex":[[-0.793941,-0.708614,0.016702],[-0.451882,0.284418,0.56528],[-0.252303,-0.348111,-0.97361],[0.089756,0.64492,-0.425033],[0.340161,-0.993103,-0.175472],[0.385988,1.120562,0.619029],[0.68222,-0.000072,0.373105]],
"edge":[[0,2],[2,4],[4,0],[3,2],[0,1],[1,3],[5,3],[1,5],[4,6],[6,1],[6,5],[3,6]],
"face":[[0,2,4],[5,3,1],[5,1,6],[5,6,3],[3,2,0,1],[1,0,4,6],[6,4,2,3]]},

"J8": {
"name":"Elongated Square Pyramid (J8)",
"category":["Johnson Solid"],
"vertex":[[-0.849167,-0.427323,0.457421],[-0.849167,0.619869,0.087182],[-0.478929,-0.776386,-0.529881],[-0.478929,0.270805,-0.900119],[0.198024,-0.30391,0.806484],[0.198024,0.743282,0.436246],[0.568263,-0.652974,-0.180817],[0.568263,0.394218,-0.551056],[1.12362,0.13242,0.37454]],
"edge":[[1,3],[3,2],[2,0],[0,1],[7,3],[1,5],[5,7],[8,7],[5,8],[0,4],[4,5],[4,8],[2,6],[6,4],[6,8],[7,6]],
"face":[[8,7,5],[8,5,4],[8,4,6],[8,6,7],[1,3,2,0],[7,3,1,5],[5,1,0,4],[4,0,2,6],[6,2,3,7]]},

"J9" : {
"name":"Elongated Pentagonal Pyramid (J9)",
"category":["Johnson Solid"],
"vertex":[[-0.980309,-0.33878,0.175213],[-0.719686,0.629425,0.02221],[-0.520232,-0.599402,-0.690328],[-0.299303,-0.403757,0.924054],[-0.25961,0.368802,-0.84333],[-0.03868,0.564448,0.771051],[0.243026,0.902834,-0.142672],[0.445117,-0.825453,-0.47642],[0.581659,-0.704537,0.521323],[0.705739,0.142752,-0.629422],[0.842281,0.263667,0.36832]],
"edge":[[8,3],[3,0],[0,2],[2,7],[7,8],[1,0],[3,5],[5,1],[6,1],[5,6],[8,10],[10,5],[10,6],[7,9],[9,10],[9,6],[2,4],[4,9],[4,6],[1,4]],
"face":[[6,1,5],[6,5,10],[6,10,9],[6,9,4],[6,4,1],[1,0,3,5],[5,3,8,10],[10,8,7,9],[9,7,2,4],[4,2,0,1],[8,3,0,2,7]]},

"J10" : {
"name":"Gyroelongated Square Pyramid (J10)",
"category":["Johnson Solid"],
"vertex":[[-0.776892,0.173498,0.416855],[-0.68155,0.270757,-0.747914],[-0.646922,-0.78715,-0.243069],[0.020463,0.897066,-0.047806],[0.069435,-0.599041,0.666153],[0.15263,0.505992,1.049841],[0.480709,0.236129,-0.900199],[0.515337,-0.821778,-0.395353],[0.866791,0.124527,0.201492]],
"edge":[[4,7],[7,8],[8,4],[7,6],[6,8],[6,3],[3,8],[6,1],[1,3],[1,0],[0,3],[1,2],[2,0],[2,4],[4,0],[2,7],[8,5],[5,4],[3,5],[0,5]],
"face":[[4,7,8],[8,7,6],[8,6,3],[3,6,1],[3,1,0],[0,1,2],[0,2,4],[4,2,7],[4,8,5],[8,3,5],[3,0,5],[0,4,5],[1,6,7,2]]},

"J11" : {
"name":"Gyroelongated Pentagonal Pyramid (J11)",
"category":["Johnson Solid"],
"vertex":[[-0.722759,-0.425905,0.628394],[-0.669286,0.622275,0.513309],[-0.502035,-0.868253,-0.304556],[-0.415513,0.827739,-0.490768],[-0.312146,-0.093458,-0.996236],[0.134982,0.097675,0.952322],[0.238349,-0.823522,0.446854],[0.324871,0.872469,0.260642],[0.492123,-0.618058,-0.557222],[0.545596,0.430122,-0.672308],[0.88582,-0.021082,0.21957]],
"edge":[[6,2],[2,8],[8,6],[2,4],[4,8],[4,9],[9,8],[4,3],[3,9],[3,7],[7,9],[3,1],[1,7],[1,5],[5,7],[1,0],[0,5],[0,6],[6,5],[0,2],[8,10],[10,6],[9,10],[7,10],[5,10]],
"face":[[6,2,8],[8,2,4],[8,4,9],[9,4,3],[9,3,7],[7,3,1],[7,1,5],[5,1,0],[5,0,6],[6,0,2],[6,8,10],[8,9,10],[9,7,10],[7,5,10],[5,6,10],[1,3,4,2,0]]},

"J12" : {
"name":"Triangular Dipyramid (J12)",
"category":["Johnson Solid"],
"vertex":[[-0.610389,0.243975,0.531213],[-0.187812,-0.48795,-0.664016],[-0.187812,0.9759,-0.664016],[0.187812,-0.9759,0.664016],[0.798201,0.243975,0.132803]],
"edge":[[1,3],[3,0],[0,1],[3,4],[4,0],[1,4],[0,2],[2,1],[4,2]],
"face":[[1,3,0],[3,4,0],[3,1,4],[0,2,1],[0,4,2],[2,4,1]]},

"J13" : {
"name":"Pentagonal Dipyramid (J13)",
"category":["Johnson Solid"],
"vertex":[[-1.028778,0.392027,-0.048786],[-0.640503,-0.646161,0.621837],[-0.125162,-0.395663,-0.540059],[0.004683,0.888447,-0.651988],[0.125161,0.395663,0.540059],[0.632925,-0.791376,0.433102],[1.031672,0.157063,-0.354165]],
"edge":[[3,2],[2,0],[0,3],[2,1],[1,0],[2,5],[5,1],[0,4],[4,3],[1,4],[5,4],[3,6],[6,2],[4,6],[6,5]],
"face":[[3,2,0],[2,1,0],[2,5,1],[0,4,3],[0,1,4],[4,1,5],[2,3,6],[3,4,6],[5,2,6],[4,5,6]]},

"J14" : {
"name":"Elongated Triangular Dipyramid (J14)",
"category":["Johnson Solid"],
"vertex":[[-0.677756,0.338878,0.309352],[-0.446131,1.338394,0],[-0.338878,-0.677755,0.309352],[-0.169439,0.508317,-0.618703],[0.169439,-0.508317,-0.618703],[0.338878,0.677756,0.309352],[0.446131,-1.338394,0],[0.677755,-0.338878,0.309352]],
"edge":[[7,4],[4,3],[3,5],[5,7],[7,6],[6,4],[3,1],[1,5],[4,2],[2,0],[0,3],[6,2],[0,1],[2,7],[5,0]],
"face":[[4,7,6],[5,3,1],[2,4,6],[3,0,1],[7,2,6],[0,5,1],[7,4,3,5],[4,2,0,3],[2,7,5,0]]},

"J15" : {
"name":"Elongated Square Dipyramid (J15)",
"category":["Johnson Solid"],
"vertex":[[-0.669867,0.334933,-0.529576],[-0.669867,0.334933,0.529577],[-0.4043,1.212901,0],[-0.334933,-0.669867,-0.529576],[-0.334933,-0.669867,0.529577],[0.334933,0.669867,-0.529576],[0.334933,0.669867,0.529577],[0.4043,-1.212901,0],[0.669867,-0.334933,-0.529576],[0.669867,-0.334933,0.529577]],
"edge":[[9,8],[8,5],[5,6],[6,9],[9,7],[7,8],[5,2],[2,6],[8,3],[3,0],[0,5],[7,3],[0,2],[3,4],[4,1],[1,0],[7,4],[1,2],[4,9],[6,1]],
"face":[[8,9,7],[6,5,2],[3,8,7],[5,0,2],[4,3,7],[0,1,2],[9,4,7],[1,6,2],[9,8,5,6],[8,3,0,5],[3,4,1,0],[4,9,6,1]]},

"J16" : {
"name":"Elongated Pentagonal Dipyramid (J16)",
"category":["Johnson Solid"],
"vertex":[[-0.931836,0.219976,-0.264632],[-0.636706,0.318353,0.692816],[-0.613483,-0.735083,-0.264632],[-0.326545,0.979634,0],[-0.318353,-0.636706,0.692816],[-0.159176,0.477529,-0.856368],[0.159176,-0.477529,-0.856368],[0.318353,0.636706,0.692816],[0.326545,-0.979634,0],[0.613482,0.735082,-0.264632],[0.636706,-0.318353,0.692816],[0.931835,-0.219977,-0.264632]],
"edge":[[10,11],[11,9],[9,7],[7,10],[10,8],[8,11],[9,3],[3,7],[11,6],[6,5],[5,9],[8,6],[5,3],[6,2],[2,0],[0,5],[8,2],[0,3],[2,4],[4,1],[1,0],[8,4],[1,3],[4,10],[7,1]],
"face":[[11,10,8],[7,9,3],[6,11,8],[9,5,3],[2,6,8],[5,0,3],[4,2,8],[0,1,3],[10,4,8],[1,7,3],[10,11,9,7],[11,6,5,9],[6,2,0,5],[2,4,1,0],[4,10,7,1]]},

"J17" : {
"name":"Gyroelongated Square Dipyramid (J17)",
"category":["Johnson Solid"],
"vertex":[[-0.777261,0.485581,0.103065],[-0.675344,-0.565479,-0.273294],[-0.379795,-0.315718,0.778861],[-0.221894,0.282623,-0.849372],[-0.034619,1.231562,-0.282624],[0.034619,-1.231562,0.282624],[0.196076,0.635838,0.638599],[0.405612,-0.602744,-0.568088],[0.701162,-0.352983,0.484067],[0.751443,0.43288,-0.313837]],
"edge":[[6,8],[8,9],[9,6],[8,7],[7,9],[7,3],[3,9],[7,1],[1,3],[1,0],[0,3],[1,2],[2,0],[2,6],[6,0],[2,8],[9,4],[4,6],[3,4],[0,4],[8,5],[5,7],[5,1],[5,2]],
"face":[[6,8,9],[9,8,7],[9,7,3],[3,7,1],[3,1,0],[0,1,2],[0,2,6],[6,2,8],[6,9,4],[9,3,4],[3,0,4],[0,6,4],[7,8,5],[1,7,5],[2,1,5],[8,2,5]]},

"J18" : {
"name":"Elongated Triangular Cupola (J18)",
"category":["Johnson Solid"],
"vertex":[[-0.836652,0.050764,0.288421],[-0.686658,0.016522,-0.560338],[-0.587106,-0.771319,0.365687],[-0.571616,0.871513,0.302147],[-0.437112,-0.805561,-0.483073],[-0.421621,0.837272,-0.546612],[-0.212729,-0.16003,0.84551],[0.052308,0.660719,0.859236],[0.08726,-0.228514,-0.852008],[0.186811,-1.016355,0.074016],[0.352296,0.592236,-0.838282],[0.561189,-0.405066,0.55384],[0.711183,-0.439308,-0.294919],[0.826226,0.415684,0.567566],[0.97622,0.381442,-0.281193]],
"edge":[[14,10],[10,5],[5,3],[3,7],[7,13],[13,14],[0,3],[5,1],[1,0],[10,8],[8,1],[14,12],[12,8],[13,11],[11,12],[7,6],[6,11],[0,6],[4,9],[9,2],[2,4],[4,8],[12,9],[11,9],[6,2],[0,2],[1,4]],
"face":[[4,9,2],[9,12,11],[2,6,0],[4,1,8],[0,3,5,1],[1,5,10,8],[8,10,14,12],[12,14,13,11],[11,13,7,6],[6,7,3,0],[9,4,8,12],[2,9,11,6],[4,2,0,1],[14,10,5,3,7,13]]},

"J19" : {
"name":"Elongated Square Cupola (J19)",
"category":["Johnson Solid"],
"vertex":[[-0.889715,0.115789,-0.35951],[-0.792371,-0.231368,0.270291],[-0.791598,0.494102,0.251959],[-0.522446,-0.406626,-0.70424],[-0.521352,0.619343,-0.730164],[-0.425102,-0.753782,-0.074439],[-0.423235,0.997655,-0.118694],[-0.286344,-0.218767,0.790309],[-0.28557,0.506702,0.771978],[-0.154083,0.096928,-1.074893],[0.080926,-0.741182,0.44558],[0.082793,1.010256,0.401324],[0.095069,-0.767118,-0.580291],[0.331944,0.146209,0.895926],[0.463432,-0.263565,-0.950945],[0.601096,-0.754518,-0.060273],[0.699213,-0.376205,0.551197],[0.700307,0.649763,0.525272],[0.969459,-0.250964,-0.430927],[1.067576,0.127349,0.180543]],
"edge":[[18,14],[14,9],[9,4],[4,6],[6,11],[11,17],[17,19],[19,18],[2,6],[4,0],[0,2],[9,3],[3,0],[14,12],[12,3],[18,15],[15,12],[19,16],[16,15],[17,13],[13,16],[11,8],[8,13],[2,8],[5,10],[10,7],[7,1],[1,5],[5,12],[15,10],[16,10],[13,7],[8,7],[2,1],[0,1],[3,5]],
"face":[[10,15,16],[7,13,8],[1,2,0],[5,3,12],[2,6,4,0],[0,4,9,3],[3,9,14,12],[12,14,18,15],[15,18,19,16],[16,19,17,13],[13,17,11,8],[8,11,6,2],[5,10,7,1],[10,5,12,15],[7,10,16,13],[1,7,8,2],[5,1,0,3],[18,14,9,4,6,11,17,19]]},

"J20" : {
"name":"Elongated Pentagonal Cupola (J20)",
"category":["Johnson Solid"],
"vertex":[[-0.93465,0.300459,-0.271185],[-0.838689,-0.260219,-0.516017],[-0.711319,0.717591,0.128359],[-0.710334,-0.156922,0.080946],[-0.599799,0.556003,-0.725148],[-0.503838,-0.004675,-0.969981],[-0.487004,0.26021,0.48049],[-0.460089,-0.750282,-0.512622],[-0.376468,0.973135,-0.325605],[-0.331735,-0.646985,0.084342],[-0.254001,0.831847,0.530001],[-0.125239,-0.494738,-0.966586],[0.029622,0.027949,0.730817],[0.056536,-0.982543,-0.262295],[0.08085,1.087391,0.076037],[0.125583,-0.532729,0.485984],[0.262625,0.599586,0.780328],[0.391387,-0.726999,-0.716259],[0.513854,-0.868287,0.139347],[0.597475,0.85513,0.326364],[0.641224,0.109523,0.783723],[0.737185,-0.451155,0.538891],[0.848705,-0.612742,-0.314616],[0.976075,0.365067,0.32976],[1.072036,-0.19561,0.084927]],
"edge":[[22,17],[17,11],[11,5],[5,4],[4,8],[8,14],[14,19],[19,23],[23,24],[24,22],[2,8],[4,0],[0,2],[5,1],[1,0],[11,7],[7,1],[17,13],[13,7],[22,18],[18,13],[24,21],[21,18],[23,20],[20,21],[19,16],[16,20],[14,10],[10,16],[2,10],[9,15],[15,12],[12,6],[6,3],[3,9],[9,13],[18,15],[21,15],[20,12],[16,12],[10,6],[2,6],[0,3],[1,3],[7,9]],
"face":[[15,18,21],[12,20,16],[6,10,2],[3,0,1],[9,7,13],[2,8,4,0],[0,4,5,1],[1,5,11,7],[7,11,17,13],[13,17,22,18],[18,22,24,21],[21,24,23,20],[20,23,19,16],[16,19,14,10],[10,14,8,2],[15,9,13,18],[12,15,21,20],[6,12,16,10],[3,6,2,0],[9,3,1,7],[9,15,12,6,3],[22,17,11,5,4,8,14,19,23,24]]},

"J21" : {
"name":"Elongated Pentagonal Rotunda (J21)",
"category":["Johnson Solid"],
"vertex":[[-0.913903,0.139054,-0.10769],[-0.801323,0.048332,0.456301],[-0.780136,-0.347362,-0.398372],[-0.694081,0.568652,0.218063],[-0.672895,0.172957,-0.63661],[-0.597978,-0.494154,0.514184],[-0.584884,-0.738707,-0.014032],[-0.468218,-0.603725,-0.817867],[-0.378156,-0.064556,0.839937],[-0.360976,-0.083405,-1.056105],[-0.317215,0.86806,-0.109531],[-0.304122,0.623508,-0.637747],[-0.272966,-0.995069,-0.433527],[-0.204636,0.777338,0.45446],[-0.161718,-0.851595,0.369604],[-0.009384,0.385994,0.8388],[0.007796,0.367145,-1.057242],[0.1502,-1.107957,-0.049891],[0.185324,0.832194,-0.40135],[0.193961,-0.156492,0.896684],[0.327727,-0.642909,0.606002],[0.367482,0.685403,0.511206],[0.497242,0.575832,-0.820845],[0.60849,0.719306,-0.017714],[0.639645,-0.899271,0.186507],[0.6965,-0.192358,0.604864],[0.803742,0.327961,0.366626],[0.920408,0.462943,-0.437208],[1.008418,-0.44872,0.185369],[1.11566,0.071599,-0.052869]],
"edge":[[24,17],[17,12],[12,7],[7,9],[9,16],[16,22],[22,27],[27,29],[29,28],[28,24],[8,15],[15,13],[13,3],[3,1],[1,8],[8,5],[5,14],[14,20],[20,19],[19,8],[19,15],[20,25],[25,19],[25,26],[26,21],[21,15],[21,13],[26,23],[23,21],[23,18],[18,10],[10,13],[10,3],[18,11],[11,10],[11,4],[4,0],[0,3],[0,1],[4,2],[2,0],[2,6],[6,5],[5,1],[6,14],[11,16],[9,4],[7,2],[12,6],[17,14],[24,20],[28,25],[29,26],[27,23],[22,18]],
"face":[[8,19,15],[19,20,25],[15,21,13],[21,26,23],[13,10,3],[10,18,11],[3,0,1],[0,4,2],[1,5,8],[5,6,14],[11,16,9,4],[4,9,7,2],[2,7,12,6],[6,12,17,14],[14,17,24,20],[20,24,28,25],[25,28,29,26],[26,29,27,23],[23,27,22,18],[18,22,16,11],[8,15,13,3,1],[8,5,14,20,19],[15,19,25,26,21],[13,21,23,18,10],[3,10,11,4,0],[1,0,2,6,5],[24,17,12,7,9,16,22,27,29,28]]},

"J22" : {
"name":"Gyroelongated Triangular Cupola (J22)",
"category":["Johnson Solid"],
"vertex":[[-0.846878,0.066004,0.311423],[-0.766106,0.678635,-0.329908],[-0.708152,-0.186985,-0.531132],[-0.64897,-0.782761,0.128183],[-0.452751,0.845109,0.48694],[-0.21247,0.406919,-0.972407],[-0.165405,0.101357,0.883692],[0.032503,-0.747408,0.700451],[0.112048,-0.404621,-0.801418],[0.17123,-1.000397,-0.142104],[0.41424,0.739868,0.66129],[0.654521,0.301678,-0.798058],[0.654794,-0.116279,0.613406],[0.793521,-0.369268,-0.229149],[0.967876,0.468152,0.018791]],
"edge":[[11,5],[5,1],[1,4],[4,10],[10,14],[14,11],[0,1],[1,2],[2,0],[5,2],[5,8],[8,2],[11,8],[11,13],[13,8],[14,13],[3,9],[9,7],[7,3],[3,2],[8,9],[13,9],[13,12],[12,7],[12,6],[6,7],[6,0],[0,3],[14,12],[10,12],[10,6],[4,6],[4,0]],
"face":[[0,1,2],[2,1,5],[2,5,8],[8,5,11],[8,11,13],[13,11,14],[3,9,7],[9,8,13],[7,12,6],[3,0,2],[13,14,12],[12,14,10],[12,10,6],[6,10,4],[6,4,0],[0,4,1],[9,3,2,8],[7,9,13,12],[3,7,6,0],[11,5,1,4,10,14]]},

"J23" : {
"name":"Gyroelongated Square Cupola (J23)",
"category":["Johnson Solid"],
"vertex":[[-0.96917,0.321358,-0.364138],[-0.902194,0.146986,0.353054],[-0.885918,-0.386527,-0.161101],[-0.700663,0.819184,0.114745],[-0.670588,-0.166619,-0.835289],[-0.389781,0.533335,0.723761],[-0.377102,-0.207546,0.737557],[-0.360826,-0.741059,0.223402],[-0.350486,-0.754679,-0.51752],[-0.022354,1.035239,0.320838],[0.020179,-0.358897,-1.022714],[0.351157,0.546203,0.733864],[0.363836,-0.194678,0.74766],[0.380112,-0.728191,0.233505],[0.390452,-0.741811,-0.507416],[0.668412,0.842961,0.133414],[0.698487,-0.142842,-0.816621],[0.886588,0.178052,0.377446],[0.902865,-0.355461,-0.136709],[0.966994,0.354984,-0.337737]],
"edge":[[10,4],[4,0],[0,3],[3,9],[9,15],[15,19],[19,16],[16,10],[1,0],[0,2],[2,1],[4,2],[4,8],[8,2],[10,8],[10,14],[14,8],[16,14],[16,18],[18,14],[19,18],[7,13],[13,12],[12,6],[6,7],[7,8],[14,13],[18,13],[18,17],[17,12],[17,11],[11,12],[11,5],[5,6],[5,1],[1,6],[2,7],[19,17],[15,17],[15,11],[9,11],[9,5],[3,5],[3,1]],
"face":[[1,0,2],[2,0,4],[2,4,8],[8,4,10],[8,10,14],[14,10,16],[14,16,18],[18,16,19],[13,14,18],[12,17,11],[6,5,1],[7,2,8],[18,19,17],[19,15,17],[17,15,11],[11,15,9],[11,9,5],[5,9,3],[5,3,1],[1,3,0],[7,13,12,6],[13,7,8,14],[12,13,18,17],[6,12,11,5],[7,6,1,2],[10,4,0,3,9,15,19,16]]},

"J24" : {
"name":"Gyroelongated Pentagonal Cupola (J24)",
"category":["Johnson Solid"],
"vertex":[[-1.007937,0.263193,-0.317378],[-0.995648,-0.249677,0.04509],[-0.928425,0.319026,0.303212],[-0.878881,-0.297121,-0.570283],[-0.751014,0.784617,-0.079308],[-0.682946,-0.746755,-0.177844],[-0.534412,-0.144902,0.458433],[-0.506952,0.74213,0.497926],[-0.413141,-0.682306,-0.741423],[-0.221709,-0.64198,0.235499],[-0.206248,1.067984,0.052991],[-0.112939,0.278202,0.653148],[-0.109759,-0.982341,-0.280438],[0.107781,0.858022,0.55486],[0.211385,-0.745233,-0.765428],[0.393024,-0.526088,0.292433],[0.418278,1.005057,0.028986],[0.460247,0.042616,0.550554],[0.504974,-0.866449,-0.223504],[0.680968,0.622436,0.452266],[0.756151,-0.461866,-0.633128],[0.884017,0.619872,-0.142153],[0.926446,-0.443346,-0.028789],[0.99367,0.125358,0.229332],[1.013073,0.059558,-0.395059]],
"edge":[[20,14],[14,8],[8,3],[3,0],[0,4],[4,10],[10,16],[16,21],[21,24],[24,20],[1,3],[3,5],[5,1],[8,5],[8,12],[12,5],[14,12],[14,18],[18,12],[20,18],[20,22],[22,18],[24,22],[24,23],[23,22],[21,23],[9,15],[15,17],[17,11],[11,6],[6,9],[9,12],[18,15],[22,15],[23,17],[23,19],[19,17],[19,13],[13,11],[13,7],[7,11],[7,2],[2,6],[2,1],[1,6],[5,9],[21,19],[16,19],[16,13],[10,13],[10,7],[4,7],[4,2],[0,2],[0,1]],
"face":[[1,3,5],[5,3,8],[5,8,12],[12,8,14],[12,14,18],[18,14,20],[18,20,22],[22,20,24],[22,24,23],[23,24,21],[15,18,22],[17,23,19],[11,13,7],[6,2,1],[9,5,12],[23,21,19],[19,21,16],[19,16,13],[13,16,10],[13,10,7],[7,10,4],[7,4,2],[2,4,0],[2,0,1],[1,0,3],[15,9,12,18],[17,15,22,23],[11,17,19,13],[6,11,7,2],[9,6,1,5],[9,15,17,11,6],[20,14,8,3,0,4,10,16,21,24]]},

"J25" : {
"name":"Gyroelongated Pentagonal Rotunda (J25)",
"category":["Johnson Solid"],
"vertex":[[-0.897802,-0.193467,-0.273331],[-0.877838,-0.070089,0.304735],[-0.73072,-0.609618,0.112262],[-0.716275,0.285603,-0.568831],[-0.703732,-0.716856,-0.46873],[-0.696138,-0.246211,-0.826802],[-0.683973,0.485232,0.366499],[-0.584121,0.705062,-0.173395],[-0.51689,0.069081,0.752092],[-0.378328,-1.037777,-0.09336],[-0.358446,0.194389,-1.030805],[-0.278847,-0.803894,0.440665],[-0.255475,0.644603,-0.661367],[-0.223173,0.844232,0.273963],[-0.146694,-0.384435,0.836102],[0.047172,0.170886,0.897866],[0.15578,-1.086392,0.15593],[0.180355,0.436649,-1.002815],[0.228699,0.649956,0.602366],[0.285215,-0.70209,0.586439],[0.308587,0.746408,-0.515593],[0.328551,0.869786,0.062473],[0.598896,0.196439,0.686376],[0.694582,-0.844133,0.183918],[0.714463,0.388033,-0.753526],[0.746014,-0.343089,0.493903],[0.760459,0.552132,-0.18719],[0.927542,0.135981,0.198403],[1.032273,-0.403533,-0.020084],[1.039867,0.067112,-0.378156]],
"edge":[[28,23],[23,16],[16,9],[9,4],[4,5],[5,10],[10,17],[17,24],[24,29],[29,28],[2,9],[9,11],[11,2],[16,11],[16,19],[19,11],[23,19],[23,25],[25,19],[28,25],[28,27],[27,25],[29,27],[29,26],[26,27],[24,26],[15,18],[18,13],[13,6],[6,8],[8,15],[15,14],[14,19],[25,22],[22,15],[22,18],[27,22],[26,21],[21,18],[21,13],[26,20],[20,21],[20,12],[12,7],[7,13],[7,6],[12,3],[3,7],[3,0],[0,1],[1,6],[1,8],[0,2],[2,1],[11,14],[14,8],[24,20],[17,20],[17,12],[10,12],[10,3],[5,3],[5,0],[4,0],[4,2]],
"face":[[2,9,11],[11,9,16],[11,16,19],[19,16,23],[19,23,25],[25,23,28],[25,28,27],[27,28,29],[27,29,26],[26,29,24],[15,22,18],[22,25,27],[18,21,13],[21,26,20],[13,7,6],[7,12,3],[6,1,8],[1,0,2],[8,14,15],[14,11,19],[26,24,20],[20,24,17],[20,17,12],[12,17,10],[12,10,3],[3,10,5],[3,5,0],[0,5,4],[0,4,2],[2,4,9],[15,18,13,6,8],[15,14,19,25,22],[18,22,27,26,21],[13,21,20,12,7],[6,7,3,0,1],[8,1,2,11,14],[28,23,16,9,4,5,10,17,24,29]]},

"J26" : {
"name":"Gyrobifastigium (J26)",
"category":["Johnson Solid"],
"vertex":[[-0.57735,0.57735,0],[0.57735,0.57735,0],[0.57735,-0.57735,0],[-0.57735,-0.57735,0],[0,0.57735,1],[0,-0.57735,1],[-0.57735,0,-1],[0.57735,0,-1]],
"edge":[[0,4],[4,5],[5,3],[3,0],[2,5],[4,1],[1,2],[0,6],[6,7],[7,1],[1,0],[2,7],[6,3],[3,2]],
"face":[[1,0,4],[3,2,5],[3,0,6],[1,2,7],[3,5,4,0],[1,4,5,2],[1,7,6,0],[3,6,7,2]]},

"J27" : {
"name":"Triangular Orthobicupola (J27)",
"category":["Johnson Solid"],
"vertex":[[-0.96936,0.238651,0.058198],[-0.683128,-0.715413,0.146701],[-0.623092,-0.255511,-0.739236],[-0.478567,-0.06233,0.875836],[-0.286232,0.954064,-0.088503],[0.060036,0.459902,-0.885938],[0.204561,0.653083,0.729135],[0.286232,-0.954064,0.088503],[0.346268,-0.494162,-0.797435],[0.490793,-0.300981,0.817638],[0.683128,0.715413,-0.146701],[0.96936,-0.238651,-0.058198]],
"edge":[[2,5],[5,8],[8,2],[2,0],[0,4],[4,5],[4,10],[10,5],[10,11],[11,8],[11,7],[7,8],[7,1],[1,2],[1,0],[6,3],[3,9],[9,6],[6,4],[0,3],[1,3],[7,9],[11,9],[10,6]],
"face":[[2,5,8],[5,4,10],[8,11,7],[2,1,0],[6,3,9],[3,0,1],[9,7,11],[6,10,4],[5,2,0,4],[8,5,10,11],[2,8,7,1],[3,6,4,0],[9,3,1,7],[6,9,11,10]]},

"J28" : {
"name":"Square Orthobicupola (J28)",
"category":["Johnson Solid"],
"vertex":[[-1.055402,0.383836,-0.00011],[-1.017695,-0.474869,0.000238],[-0.474869,1.017695,-0.000394],[-0.448233,0.410252,-0.607929],[-0.448179,0.410746,0.607634],[-0.410526,-0.448453,-0.607581],[-0.410472,-0.447959,0.607981],[-0.383836,-1.055402,0.000446],[0.383836,1.055402,-0.000447],[0.410472,0.447959,-0.607982],[0.410526,0.448453,0.60758],[0.448179,-0.410746,-0.607635],[0.448233,-0.410252,0.607928],[0.474869,-1.017695,0.000392],[1.017695,0.474869,-0.000239],[1.055402,-0.383836,0.000109]],
"edge":[[5,3],[3,9],[9,11],[11,5],[5,1],[1,0],[0,3],[0,2],[2,3],[2,8],[8,9],[8,14],[14,9],[14,15],[15,11],[15,13],[13,11],[13,7],[7,5],[7,1],[4,6],[6,12],[12,10],[10,4],[4,0],[1,6],[7,6],[13,12],[15,12],[14,10],[8,10],[2,4]],
"face":[[3,0,2],[9,8,14],[11,15,13],[5,7,1],[6,1,7],[12,13,15],[10,14,8],[4,2,0],[5,3,9,11],[3,5,1,0],[9,3,2,8],[11,9,14,15],[5,11,13,7],[4,6,12,10],[6,4,0,1],[12,6,7,13],[10,12,15,14],[4,10,8,2]]},

"J29" : {
"name":"Square Gyrobicupola (J29)",
"category":["Johnson Solid"],
"vertex":[[-1.105,-0.077473,-0.184867],[-0.863019,0.717824,0.033637],[-0.699688,-0.827387,-0.295079],[-0.617244,-0.39909,0.445571],[-0.487757,0.321617,-0.630438],[-0.375262,0.396206,0.664075],[-0.115492,1.092629,0.232437],[-0.082444,-0.428297,-0.740649],[0.115493,-1.092629,-0.232437],[0.197937,-0.664332,0.508212],[0.25977,0.696423,-0.431638],[0.439918,0.130964,0.726716],[0.665082,-0.053491,-0.541849],[0.699688,0.827387,0.295079],[0.863019,-0.717824,-0.033637],[1.105,0.077473,0.184867]],
"edge":[[7,4],[4,10],[10,12],[12,7],[7,2],[2,0],[0,4],[0,1],[1,4],[1,6],[6,10],[6,13],[13,10],[13,15],[15,12],[15,14],[14,12],[14,8],[8,7],[8,2],[5,3],[3,9],[9,11],[11,5],[5,1],[0,3],[2,3],[8,9],[14,9],[15,11],[13,11],[6,5]],
"face":[[4,0,1],[10,6,13],[12,15,14],[7,8,2],[3,0,2],[9,8,14],[11,15,13],[5,6,1],[7,4,10,12],[4,7,2,0],[10,4,1,6],[12,10,13,15],[7,12,14,8],[5,3,9,11],[3,5,1,0],[9,3,2,8],[11,9,14,15],[5,11,13,6]]},

"J30" : {
"name":"Pentagonal Orthobicupola (J30)",
"category":["Johnson Solid"],
"vertex":[[-1.197125,-0.118752,-0.001762],[-1.038244,0.607337,-0.020132],[-0.898745,-0.799482,0.017282],[-0.619431,0.145275,0.38469],[-0.61625,0.124807,-0.396793],[-0.482789,1.101444,-0.030813],[-0.321051,-0.535454,0.403734],[-0.317871,-0.555923,-0.37775],[-0.257075,-1.174837,0.029724],[-0.063976,0.639383,0.37401],[-0.060795,0.618915,-0.407474],[0.257076,1.174837,-0.029725],[0.418813,-0.462061,0.404823],[0.421993,-0.48253,-0.376661],[0.482789,-1.101444,0.030813],[0.577694,0.264028,0.386452],[0.580875,0.24356,-0.395032],[0.898745,0.799482,-0.017282],[1.038244,-0.607337,0.020132],[1.197125,0.118752,0.001761]],
"edge":[[7,4],[4,10],[10,16],[16,13],[13,7],[7,2],[2,0],[0,4],[0,1],[1,4],[1,5],[5,10],[5,11],[11,10],[11,17],[17,16],[17,19],[19,16],[19,18],[18,13],[18,14],[14,13],[14,8],[8,7],[8,2],[3,6],[6,12],[12,15],[15,9],[9,3],[3,0],[2,6],[8,6],[14,12],[18,12],[19,15],[17,15],[11,9],[5,9],[1,3]],
"face":[[4,0,1],[10,5,11],[16,17,19],[13,18,14],[7,8,2],[6,2,8],[12,14,18],[15,19,17],[9,11,5],[3,1,0],[4,7,2,0],[10,4,1,5],[16,10,11,17],[13,16,19,18],[7,13,14,8],[6,3,0,2],[12,6,8,14],[15,12,18,19],[9,15,17,11],[3,9,5,1],[7,4,10,16,13],[3,6,12,15,9]]},

"J31" : {
"name":"Pentagonal Gyrobicupola (J31)",
"category":["Johnson Solid"],
"vertex":[[-1.14213,-0.353364,-0.133745],[-1.138435,0.385484,-0.050817],[-0.70957,-0.957238,-0.165587],[-0.699897,0.97709,0.051522],[-0.598391,0.052172,-0.43817],[-0.543739,-0.405536,0.304426],[-0.540044,0.333311,0.387353],[-0.165831,-0.551702,-0.470012],[-0.159853,0.643778,-0.335832],[-0.005978,-1.19548,-0.13418],[0.005978,1.195481,0.134181],[0.159852,-0.643778,0.335832],[0.165831,0.551702,0.470012],[0.540044,-0.333311,-0.387353],[0.543739,0.405536,-0.304425],[0.598391,-0.052172,0.43817],[0.699896,-0.97709,-0.051521],[0.70957,0.957238,0.165587],[1.138435,-0.385484,0.050817],[1.142129,0.353364,0.133745]],
"edge":[[7,4],[4,8],[8,14],[14,13],[13,7],[7,2],[2,0],[0,4],[0,1],[1,4],[1,3],[3,8],[3,10],[10,8],[10,17],[17,14],[17,19],[19,14],[19,18],[18,13],[18,16],[16,13],[16,9],[9,7],[9,2],[6,5],[5,11],[11,15],[15,12],[12,6],[6,1],[0,5],[2,5],[9,11],[16,11],[18,15],[19,15],[17,12],[10,12],[3,6]],
"face":[[4,0,1],[8,3,10],[14,17,19],[13,18,16],[7,9,2],[5,0,2],[11,9,16],[15,18,19],[12,17,10],[6,3,1],[4,7,2,0],[8,4,1,3],[14,8,10,17],[13,14,19,18],[7,13,16,9],[5,6,1,0],[11,5,2,9],[15,11,16,18],[12,15,19,17],[6,12,10,3],[7,4,8,14,13],[6,5,11,15,12]]},

"J32" : {
"name":"Pentagonal Orthocupolarotunda (J32)",
"category":["Johnson Solid"],
"vertex":[[-1.086754,0.270723,-0.02221],[-0.951485,0.016307,0.590957],[-0.844123,0.345447,-0.65034],[-0.727726,-0.227595,-0.308179],[-0.678317,0.606577,0.401324],[-0.592457,-0.482012,0.304989],[-0.489983,-0.320625,0.954953],[-0.316268,0.211936,-1.053507],[-0.285732,0.727482,-0.61501],[-0.199871,-0.361106,-0.711346],[-0.183258,0.888869,0.034954],[-0.047989,0.634452,0.648121],[0.019,-0.772761,0.28078],[0.068408,0.06141,0.990283],[0.121473,-0.611374,0.930744],[0.261631,-0.698037,-0.34735],[0.295188,-0.078813,-1.077716],[0.344597,0.755358,-0.368213],[0.563468,0.343703,0.623912],[0.649328,-0.744886,0.527576],[0.703625,0.25704,-0.654181],[0.75669,-0.415745,-0.71372],[0.806099,0.418427,-0.004217],[0.891959,-0.670162,-0.100552],[0.922496,-0.154616,0.337944]],
"edge":[[5,3],[3,9],[9,15],[15,12],[12,5],[5,1],[1,0],[0,3],[0,2],[2,3],[2,7],[7,9],[7,16],[16,9],[16,21],[21,15],[21,23],[23,15],[23,19],[19,12],[19,14],[14,12],[14,6],[6,5],[6,1],[18,22],[22,17],[17,10],[10,11],[11,18],[18,13],[13,14],[19,24],[24,18],[24,22],[23,24],[21,20],[20,22],[20,17],[16,20],[7,8],[8,17],[8,10],[2,8],[0,4],[4,10],[4,11],[1,4],[6,13],[13,11]],
"face":[[3,0,2],[9,7,16],[15,21,23],[12,19,14],[5,6,1],[18,24,22],[24,19,23],[22,20,17],[20,21,16],[17,8,10],[8,7,2],[10,4,11],[4,0,1],[11,13,18],[13,6,14],[3,5,1,0],[9,3,2,7],[15,9,16,21],[12,15,23,19],[5,12,14,6],[5,3,9,15,12],[18,22,17,10,11],[18,13,14,19,24],[22,24,23,21,20],[17,20,16,7,8],[10,8,2,0,4],[11,4,1,6,13]]},

"J33" : {
"name":"Pentagonal Gyrocupolarotunda (J33)",
"category":["Johnson Solid"],
"vertex":[[-0.799512,0.192706,0.001565],[-0.776446,0.593934,0.546986],[-0.713384,0.860598,-0.072621],[-0.640335,-0.34095,0.387405],[-0.617268,0.060277,0.932827],[-0.538299,0.090521,-0.615141],[-0.452171,0.758412,-0.689327],[-0.296652,-0.536533,0.937522],[-0.280744,-0.772953,0.009162],[-0.217683,-0.506289,-0.610445],[-0.200278,0.902051,0.367837],[-0.09258,0.326409,-1.06757],[0.057277,0.038576,0.99214],[0.062939,-0.968537,0.559279],[0.222374,0.736712,-0.630014],[0.228036,-0.270402,-1.062874],[0.314991,0.558821,0.642957],[0.324152,-1.070722,-0.057426],[0.378052,0.825485,0.023349],[0.387214,-0.804058,-0.677033],[0.635607,-0.037989,0.647653],[0.639107,-0.66042,0.38013],[0.737643,0.393482,-0.354893],[0.741142,-0.228948,-0.622416],[0.89682,-0.140175,0.030947]],
"edge":[[0,5],[5,9],[9,8],[8,3],[3,0],[0,2],[2,6],[6,5],[6,11],[11,5],[11,15],[15,9],[15,19],[19,9],[19,17],[17,8],[17,13],[13,8],[13,7],[7,3],[7,4],[4,3],[4,1],[1,0],[1,2],[20,24],[24,22],[22,18],[18,16],[16,20],[20,12],[12,7],[13,21],[21,20],[21,24],[17,21],[19,23],[23,24],[23,22],[15,23],[11,14],[14,22],[14,18],[6,14],[2,10],[10,18],[10,16],[1,10],[4,12],[12,16]],
"face":[[5,6,11],[9,15,19],[8,17,13],[3,7,4],[0,1,2],[20,21,24],[21,13,17],[24,23,22],[23,19,15],[22,14,18],[14,11,6],[18,10,16],[10,2,1],[16,12,20],[12,4,7],[5,0,2,6],[9,5,11,15],[8,9,19,17],[3,8,13,7],[0,3,4,1],[0,5,9,8,3],[20,24,22,18,16],[20,12,7,13,21],[24,21,17,19,23],[22,23,15,11,14],[18,14,6,2,10],[16,10,1,4,12]]},

"J34" : {
"name":"Pentagonal Orthobirotunda (J34)",
"category":["Johnson Solid"],
"vertex":[[-0.976027,0.021192,0.216616],[-0.8986,-0.336852,-0.281155],[-0.800821,0.595002,0.068255],[-0.778424,-0.560713,0.282236],[-0.680644,0.371141,0.631647],[-0.675542,0.015675,-0.737155],[-0.615111,0.591592,-0.521207],[-0.523949,-0.823998,-0.215648],[-0.360916,-0.5704,0.737823],[-0.319728,0.941541,-0.106177],[-0.300485,0.005517,0.953771],[-0.19445,0.362214,-0.911587],[-0.163033,-0.253598,-0.953472],[-0.125279,0.579327,0.80541],[-0.069344,-0.772544,-0.631163],[0.050833,-0.996405,-0.067772],[0.097779,0.931854,0.34941],[0.151593,-0.839673,0.521506],[0.194449,-0.362214,0.911587],[0.283489,0.928444,-0.240052],[0.360916,0.5704,-0.737823],[0.411749,-0.426005,-0.805595],[0.477939,0.56623,0.671534],[0.606198,-0.788219,0.105992],[0.675542,-0.015675,0.737155],[0.735567,0.083254,-0.672317],[0.778423,0.560713,-0.282236],[0.829257,-0.435692,-0.350008],[0.8986,0.336852,0.281155],[0.930017,-0.27896,0.23927]],
"edge":[[15,14],[14,21],[21,27],[27,23],[23,15],[15,17],[17,8],[8,3],[3,7],[7,15],[7,14],[3,1],[1,7],[1,5],[5,12],[12,14],[12,21],[5,11],[11,12],[11,20],[20,25],[25,21],[25,27],[20,26],[26,25],[26,28],[28,29],[29,27],[29,23],[28,24],[24,29],[24,18],[18,17],[17,23],[18,8],[4,13],[13,16],[16,9],[9,2],[2,4],[4,0],[0,3],[8,10],[10,4],[10,13],[18,10],[24,22],[22,13],[22,16],[28,22],[26,19],[19,16],[19,9],[20,19],[11,6],[6,9],[6,2],[5,6],[1,0],[0,2]],
"face":[[15,7,14],[7,3,1],[14,12,21],[12,5,11],[21,25,27],[25,20,26],[27,29,23],[29,28,24],[23,17,15],[17,18,8],[4,10,13],[10,8,18],[13,22,16],[22,24,28],[16,19,9],[19,26,20],[9,6,2],[6,11,5],[2,0,4],[0,1,3],[15,14,21,27,23],[15,17,8,3,7],[14,7,1,5,12],[21,12,11,20,25],[27,25,26,28,29],[23,29,24,18,17],[4,13,16,9,2],[4,0,3,8,10],[13,10,18,24,22],[16,22,28,26,19],[9,19,20,11,6],[2,6,5,1,0]]},

"J35" : {
"name":"Elongated Triangular Orthobicupola (J35)",
"category":["Johnson Solid"],
"vertex":[[-0.903332,-0.063468,0.034076],[-0.833437,0.28305,0.763458],[-0.589483,0.680853,0.100738],[-0.561749,-0.142046,-0.696749],[-0.484641,-0.705032,0.29875],[-0.414746,-0.358514,1.028133],[-0.2479,0.602275,-0.630087],[-0.143058,-0.78361,-0.432074],[-0.100897,0.385807,1.094795],[0.065949,0.076155,-1.160799],[0.143058,0.78361,0.432075],[0.2479,-0.602274,0.630087],[0.484641,-0.565409,-0.896124],[0.484641,0.705032,-0.29875],[0.561749,0.142046,0.696749],[0.589483,-0.680852,-0.100737],[0.79849,0.178912,-0.829462],[0.903332,0.063468,-0.034075]],
"edge":[[9,16],[16,12],[12,9],[9,6],[6,13],[13,16],[13,17],[17,16],[17,15],[15,12],[15,7],[7,12],[7,3],[3,9],[3,6],[8,1],[1,5],[5,8],[8,10],[10,2],[2,1],[2,0],[0,1],[0,4],[4,5],[4,11],[11,5],[11,14],[14,8],[14,10],[7,4],[0,3],[2,6],[10,13],[14,17],[11,15]],
"face":[[9,16,12],[16,13,17],[12,15,7],[9,3,6],[8,1,5],[1,2,0],[5,4,11],[8,14,10],[16,9,6,13],[12,16,17,15],[9,12,7,3],[1,8,10,2],[5,1,0,4],[8,5,11,14],[7,4,0,3],[3,0,2,6],[6,2,10,13],[13,10,14,17],[17,14,11,15],[15,11,4,7]]},

"J36" : {
"name":"Elongated Triangular Gyrobicupola (J36)",
"category":["Johnson Solid"],
"vertex":[[-0.82124,-0.196132,-0.329082],[-0.725355,-0.267867,0.472553],[-0.627806,0.589563,-0.281911],[-0.577286,0.20167,-0.991803],[-0.531921,0.517828,0.519724],[-0.241376,-0.749828,-0.447988],[-0.196012,-0.43367,1.063538],[-0.145492,-0.821562,0.353647],[-0.002578,0.352025,1.11071],[0.002578,-0.352025,-1.110709],[0.145492,0.821563,-0.353646],[0.196012,0.43367,-1.063538],[0.241376,0.749828,0.447989],[0.531921,-0.517828,-0.519723],[0.577285,-0.20167,0.991804],[0.627806,-0.589563,0.281912],[0.725355,0.267867,-0.472551],[0.82124,0.196133,0.329083]],
"edge":[[3,11],[11,9],[9,3],[3,2],[2,10],[10,11],[10,16],[16,11],[16,13],[13,9],[13,5],[5,9],[5,0],[0,3],[0,2],[14,8],[8,6],[6,14],[14,17],[17,12],[12,8],[12,4],[4,8],[4,1],[1,6],[1,7],[7,6],[7,15],[15,14],[15,17],[5,7],[1,0],[4,2],[12,10],[17,16],[15,13]],
"face":[[3,11,9],[11,10,16],[9,13,5],[3,0,2],[14,8,6],[8,12,4],[6,1,7],[14,15,17],[11,3,2,10],[9,11,16,13],[3,9,5,0],[8,14,17,12],[6,8,4,1],[14,6,7,15],[5,7,1,0],[0,1,4,2],[2,4,12,10],[10,12,17,16],[16,17,15,13],[13,15,7,5]]},

"J37" : {
"name":"Elongated Square Gyrobicupola (J37)",
"category":["Johnson Solid"],
"vertex":[[-0.862856,0.357407,-0.357407],[-0.862856,-0.357407,-0.357407],[-0.357407,0.862856,-0.357407],[-0.357407,0.357407,-0.862856],[-0.357407,-0.357407,-0.862856],[-0.357407,-0.862856,-0.357407],[0.357407,0.862856,-0.357407],[0.357407,0.357407,-0.862856],[0.357407,-0.357407,-0.862856],[0.357407,-0.862856,-0.357407],[0.862856,0.357407,-0.357407],[0.862856,-0.357407,-0.357407],[0.862856,0.357407,0.357407],[0.862856,-0.357407,0.357407],[0.357407,0.862856,0.357407],[0.505449,0,0.862856],[0.357407,-0.862856,0.357407],[0,0.505449,0.862856],[0,-0.505449,0.862856],[-0.357407,0.862856,0.357407],[-0.505449,0,0.862856],[-0.357407,-0.862856,0.357407],[-0.862856,0.357407,0.357407],[-0.862856,-0.357407,0.357407]],
"edge":[[0,3],[3,2],[2,0],[0,1],[1,4],[4,3],[1,5],[5,4],[3,7],[7,6],[6,2],[4,8],[8,7],[5,9],[9,8],[7,10],[10,6],[8,11],[11,10],[9,11],[12,13],[13,15],[15,12],[15,17],[17,14],[14,12],[13,16],[16,18],[18,15],[17,19],[19,14],[18,20],[20,17],[16,21],[21,18],[20,22],[22,19],[20,23],[23,22],[21,23],[2,19],[22,0],[6,14],[10,12],[11,13],[9,16],[5,21],[1,23]],
"face":[[0,3,2],[1,5,4],[6,7,10],[8,9,11],[12,13,15],[14,17,19],[16,21,18],[20,23,22],[0,1,4,3],[2,3,7,6],[3,4,8,7],[4,5,9,8],[7,8,11,10],[12,15,17,14],[13,16,18,15],[15,18,20,17],[17,20,22,19],[18,21,23,20],[0,2,19,22],[2,6,14,19],[6,10,12,14],[10,11,13,12],[9,16,13,11],[5,21,16,9],[1,23,21,5],[0,22,23,1]]},

"J38" : {
"name":"Elongated Pentagonal Orthobicupola (J38)",
"category":["Johnson Solid"],
"vertex":[[-1.047541,-0.14473,-0.164687],[-0.97266,0.443085,0.054945],[-0.794156,0.029302,-0.716846],[-0.77069,-0.7105,-0.215961],[-0.748241,-0.047945,0.383423],[-0.719275,0.617116,-0.497215],[-0.574648,0.82842,0.359043],[-0.517304,-0.536469,-0.76812],[-0.471389,-0.613715,0.332149],[-0.350229,0.33739,0.687521],[-0.321263,1.002451,-0.193117],[-0.247853,-1.03812,-0.079291],[-0.228431,0.309073,-0.749313],[-0.005532,0.864089,0.631452],[0.005532,-0.864089,-0.631452],[0.048421,-0.256696,-0.800587],[0.097726,-0.578045,0.604557],[0.169581,0.694408,-0.445215],[0.172608,0.009769,0.824189],[0.247853,1.03812,0.079291],[0.321263,-1.002451,0.193117],[0.517305,0.536469,0.76812],[0.574648,-0.82842,-0.359043],[0.617537,-0.221027,-0.528178],[0.692418,0.366788,-0.308546],[0.719275,-0.617116,0.497214],[0.77069,0.7105,0.215961],[0.794156,-0.029301,0.716846],[0.97266,-0.443085,-0.054945],[1.047542,0.14473,0.164687]],
"edge":[[12,17],[17,24],[24,23],[23,15],[15,12],[12,5],[5,10],[10,17],[10,19],[19,17],[19,26],[26,24],[26,29],[29,24],[29,28],[28,23],[28,22],[22,23],[22,14],[14,15],[14,7],[7,15],[7,2],[2,12],[2,5],[9,4],[4,8],[8,16],[16,18],[18,9],[9,6],[6,1],[1,4],[1,0],[0,4],[0,3],[3,8],[3,11],[11,8],[11,20],[20,16],[20,25],[25,16],[25,27],[27,18],[27,21],[21,18],[21,13],[13,9],[13,6],[22,20],[11,14],[3,7],[0,2],[1,5],[6,10],[13,19],[21,26],[27,29],[25,28]],
"face":[[17,10,19],[24,26,29],[23,28,22],[15,14,7],[12,2,5],[4,1,0],[8,3,11],[16,20,25],[18,27,21],[9,13,6],[17,12,5,10],[24,17,19,26],[23,24,29,28],[15,23,22,14],[12,15,7,2],[4,9,6,1],[8,4,0,3],[16,8,11,20],[18,16,25,27],[9,18,21,13],[22,20,11,14],[14,11,3,7],[7,3,0,2],[2,0,1,5],[5,1,6,10],[10,6,13,19],[19,13,21,26],[26,21,27,29],[29,27,25,28],[28,25,20,22],[12,17,24,23,15],[9,4,8,16,18]]},

"J39" : {
"name":"Elongated Pentagonal Gyrobicupola (J39)",
"category":["Johnson Solid"],
"vertex":[[-1.006864,0.217224,-0.290603],[-0.990318,0.219795,0.341133],[-0.944481,-0.411647,-0.289678],[-0.927935,-0.409077,0.342059],[-0.687819,0.762632,-0.301179],[-0.671273,0.765203,0.330558],[-0.551737,-0.055664,-0.63377],[-0.524499,-0.883775,-0.298756],[-0.507953,-0.881203,0.33298],[-0.446854,0.274173,0.659035],[-0.384471,-0.354698,0.65996],[-0.232692,0.489744,-0.644346],[-0.131755,-0.527791,-0.642848],[-0.10921,1.01625,-0.317365],[-0.092665,1.018821,0.314371],[0.092664,-1.018821,-0.314371],[0.10921,-1.01625,0.317365],[0.131755,0.527791,0.642848],[0.232692,-0.489745,0.644346],[0.384471,0.354698,-0.65996],[0.446854,-0.274173,-0.659035],[0.507953,0.881203,-0.33298],[0.524499,0.883774,0.298756],[0.551737,0.055664,0.63377],[0.671273,-0.765203,-0.330558],[0.687819,-0.762632,0.301179],[0.927935,0.409076,-0.342059],[0.944481,0.411647,0.289678],[0.990318,-0.219795,-0.341133],[1.006864,-0.217224,0.290603]],
"edge":[[6,11],[11,19],[19,20],[20,12],[12,6],[6,0],[0,4],[4,11],[4,13],[13,11],[13,21],[21,19],[21,26],[26,19],[26,28],[28,20],[28,24],[24,20],[24,15],[15,12],[15,7],[7,12],[7,2],[2,6],[2,0],[17,9],[9,10],[10,18],[18,23],[23,17],[17,14],[14,5],[5,9],[5,1],[1,9],[1,3],[3,10],[3,8],[8,10],[8,16],[16,18],[16,25],[25,18],[25,29],[29,23],[29,27],[27,23],[27,22],[22,17],[22,14],[24,25],[16,15],[8,7],[3,2],[1,0],[5,4],[14,13],[22,21],[27,26],[29,28]],
"face":[[11,4,13],[19,21,26],[20,28,24],[12,15,7],[6,2,0],[9,5,1],[10,3,8],[18,16,25],[23,29,27],[17,22,14],[11,6,0,4],[19,11,13,21],[20,19,26,28],[12,20,24,15],[6,12,7,2],[9,17,14,5],[10,9,1,3],[18,10,8,16],[23,18,25,29],[17,23,27,22],[24,25,16,15],[15,16,8,7],[7,8,3,2],[2,3,1,0],[0,1,5,4],[4,5,14,13],[13,14,22,21],[21,22,27,26],[26,27,29,28],[28,29,25,24],[6,11,19,20,12],[17,9,10,18,23]]},

"J40" : {
"name":"Elongated Pentagonal Orthocupolarotunda (J40)",
"category":["Johnson Solid"],
"vertex":[[-1.05518,-0.061289,-0.047893],[-0.934164,0.280612,0.409939],[-0.859454,-0.241561,-0.56784],[-0.777777,-0.505581,0.210572],[-0.776073,0.311702,-0.400212],[-0.656761,-0.163679,0.668404],[-0.655057,0.653604,0.05762],[-0.582051,-0.685853,-0.309375],[-0.542629,0.653549,0.63078],[-0.421745,-0.191346,-0.9513],[-0.400139,-0.685942,0.618017],[-0.338365,0.361918,-0.783672],[-0.265226,0.209257,0.889245],[-0.144342,-0.635637,-0.692835],[-0.142556,0.915126,-0.042884],[-0.083446,-0.977628,-0.223275],[-0.030129,0.915071,0.530275],[0.028982,-0.977682,0.349884],[0.05317,0.734854,-0.562831],[0.090755,0.070177,-1.051805],[0.149998,-0.635781,0.807716],[0.233378,-0.082518,0.975345],[0.247274,0.47078,0.788741],[0.368158,-0.374115,-0.793339],[0.40758,0.965287,0.146815],[0.46669,-0.927467,-0.033576],[0.48229,0.443114,-0.830964],[0.603306,0.785015,-0.373132],[0.662498,-0.374258,0.707212],[0.684983,0.520995,0.405281],[0.745797,-0.554475,-0.385895],[0.759693,-0.001178,-0.572498],[0.858225,-0.55453,0.187265],[0.880709,0.340724,-0.114666],[0.941605,-0.001267,0.354893]],
"edge":[[4,6],[6,14],[14,18],[18,11],[11,4],[4,0],[0,1],[1,6],[1,8],[8,6],[8,16],[16,14],[16,24],[24,14],[24,27],[27,18],[27,26],[26,18],[26,19],[19,11],[19,9],[9,11],[9,2],[2,4],[2,0],[20,17],[17,25],[25,32],[32,28],[28,20],[20,21],[21,12],[12,5],[5,10],[10,20],[10,17],[5,3],[3,10],[3,7],[7,15],[15,17],[15,25],[7,13],[13,15],[13,23],[23,30],[30,25],[30,32],[23,31],[31,30],[31,33],[33,34],[34,32],[34,28],[33,29],[29,34],[29,22],[22,21],[21,28],[22,12],[26,31],[23,19],[13,9],[7,2],[3,0],[5,1],[12,8],[22,16],[29,24],[33,27]],
"face":[[6,1,8],[14,16,24],[18,27,26],[11,19,9],[4,2,0],[20,10,17],[10,5,3],[17,15,25],[15,7,13],[25,30,32],[30,23,31],[32,34,28],[34,33,29],[28,21,20],[21,22,12],[6,4,0,1],[14,6,8,16],[18,14,24,27],[11,18,26,19],[4,11,9,2],[26,31,23,19],[19,23,13,9],[9,13,7,2],[2,7,3,0],[0,3,5,1],[1,5,12,8],[8,12,22,16],[16,22,29,24],[24,29,33,27],[27,33,31,26],[4,6,14,18,11],[20,17,25,32,28],[20,21,12,5,10],[17,10,3,7,15],[25,15,13,23,30],[32,30,31,33,34],[28,34,29,22,21]]},

"J41" : {
"name":"Elongated Pentagonal Gyrocupolarotunda (J41)",
"category":["Johnson Solid"],
"vertex":[[-1.045033,0.161365,0.036367],[-0.919366,0.043922,-0.521815],[-0.855707,-0.369212,0.190625],[-0.830432,0.382234,0.532668],[-0.73004,-0.486655,-0.367556],[-0.711442,0.52894,-0.271461],[-0.641106,-0.148342,0.686927],[-0.544409,-0.844483,0.055116],[-0.501432,0.074765,-0.928671],[-0.496841,0.749809,0.224841],[-0.357534,0.622166,0.777518],[-0.312106,-0.455811,-0.774412],[-0.293508,0.559783,-0.678317],[-0.197177,-0.487108,0.858148],[-0.168208,0.09159,0.931777],[-0.137415,-0.917347,0.467667],[-0.011748,-1.03479,-0.090514],[0.049132,0.242114,-1.028796],[0.053724,0.917158,0.124716],[0.131823,-0.794577,-0.603191],[0.17939,0.799715,-0.433466],[0.193031,0.789515,0.677394],[0.238459,-0.288463,-0.874537],[0.335483,-0.677415,0.712518],[0.382357,0.258938,0.831652],[0.522031,0.482046,-0.783946],[0.538816,-0.867441,-0.190639],[0.610965,0.820358,0.270538],[0.693655,-0.216333,0.696143],[0.711357,-0.048531,-0.629687],[0.736632,0.702915,-0.287644],[0.753417,-0.646572,0.305662],[0.800291,0.289782,0.424796],[0.896988,-0.406359,-0.207015],[0.925958,0.172339,-0.133386]],
"edge":[[5,9],[9,18],[18,20],[20,12],[12,5],[5,0],[0,3],[3,9],[3,10],[10,9],[10,21],[21,18],[21,27],[27,18],[27,30],[30,20],[30,25],[25,20],[25,17],[17,12],[17,8],[8,12],[8,1],[1,5],[1,0],[15,16],[16,26],[26,31],[31,23],[23,15],[15,13],[13,6],[6,2],[2,7],[7,15],[7,16],[2,4],[4,7],[4,11],[11,19],[19,16],[19,26],[11,22],[22,19],[22,29],[29,33],[33,26],[33,31],[29,34],[34,33],[34,32],[32,28],[28,31],[28,23],[32,24],[24,28],[24,14],[14,13],[13,23],[14,6],[25,29],[22,17],[11,8],[4,1],[2,0],[6,3],[14,10],[24,21],[32,27],[34,30]],
"face":[[9,3,10],[18,21,27],[20,30,25],[12,17,8],[5,1,0],[15,7,16],[7,2,4],[16,19,26],[19,11,22],[26,33,31],[33,29,34],[31,28,23],[28,32,24],[23,13,15],[13,14,6],[9,5,0,3],[18,9,10,21],[20,18,27,30],[12,20,25,17],[5,12,8,1],[25,29,22,17],[17,22,11,8],[8,11,4,1],[1,4,2,0],[0,2,6,3],[3,6,14,10],[10,14,24,21],[21,24,32,27],[27,32,34,30],[30,34,29,25],[5,9,18,20,12],[15,16,26,31,23],[15,13,6,2,7],[16,7,4,11,19],[26,19,22,29,33],[31,33,34,32,28],[23,28,24,14,13]]},

"J42" : {
"name":"Elongated Pentagonal Orthobirotunda (J42)",
"category":["Johnson Solid"],
"vertex":[[-1.094229,0.091579,-0.183298],[-0.983491,-0.29488,0.177777],[-0.97462,-0.408146,-0.350504],[-0.882171,0.554599,-0.002654],[-0.873301,0.441333,-0.530935],[-0.702994,-0.070704,0.581578],[-0.679771,-0.367238,-0.801479],[-0.640375,0.454303,0.470066],[-0.617152,0.157769,-0.912991],[-0.583386,-0.570429,0.414373],[-0.569033,-0.753697,-0.440404],[-0.419447,0.804058,0.122429],[-0.405095,0.620789,-0.732347],[-0.327237,-0.853993,0.032316],[-0.251159,-0.061675,0.877809],[-0.211565,-0.187782,-1.002892],[-0.18854,0.463332,0.766296],[-0.131551,-0.5614,0.710603],[-0.124598,0.844965,-0.328546],[-0.032387,-0.813085,-0.41866],[0.032387,0.813086,0.418659],[0.124598,-0.844964,0.328546],[0.131551,0.561401,-0.710603],[0.18854,-0.463331,-0.766296],[0.237051,-0.270491,0.977985],[0.251159,0.061676,-0.877809],[0.327237,0.853994,-0.032316],[0.33837,0.578988,0.797554],[0.419448,-0.804057,-0.122429],[0.583386,0.570429,-0.414373],[0.601401,0.125461,0.928384],[0.640375,-0.454302,-0.470066],[0.651509,-0.729308,0.359803],[0.702994,0.070705,-0.581579],[0.721009,-0.374264,0.761179],[0.815447,0.645178,0.06786],[0.822328,0.475215,0.580748],[1.008977,-0.163393,-0.202684],[1.015858,-0.333356,0.310203],[1.078477,0.191651,0.198691]],
"edge":[[0,4],[4,8],[8,6],[6,2],[2,0],[0,1],[1,5],[5,7],[7,3],[3,0],[3,4],[7,11],[11,3],[11,18],[18,12],[12,4],[12,8],[18,22],[22,12],[22,25],[25,15],[15,8],[15,6],[25,23],[23,15],[23,19],[19,10],[10,6],[10,2],[19,13],[13,10],[13,9],[9,1],[1,2],[9,5],[30,34],[34,38],[38,39],[39,36],[36,30],[30,27],[27,16],[16,14],[14,24],[24,30],[24,34],[14,17],[17,24],[17,21],[21,32],[32,34],[32,38],[21,28],[28,32],[28,31],[31,37],[37,38],[37,39],[31,33],[33,37],[33,29],[29,35],[35,39],[35,36],[29,26],[26,35],[26,20],[20,27],[27,36],[20,16],[23,31],[28,19],[21,13],[17,9],[14,5],[16,7],[20,11],[26,18],[29,22],[33,25]],
"face":[[0,3,4],[3,7,11],[4,12,8],[12,18,22],[8,15,6],[15,25,23],[6,10,2],[10,19,13],[2,1,0],[1,9,5],[30,24,34],[24,14,17],[34,32,38],[32,21,28],[38,37,39],[37,31,33],[39,35,36],[35,29,26],[36,27,30],[27,20,16],[23,31,28,19],[19,28,21,13],[13,21,17,9],[9,17,14,5],[5,14,16,7],[7,16,20,11],[11,20,26,18],[18,26,29,22],[22,29,33,25],[25,33,31,23],[0,4,8,6,2],[0,1,5,7,3],[4,3,11,18,12],[8,12,22,25,15],[6,15,23,19,10],[2,10,13,9,1],[30,34,38,39,36],[30,27,16,14,24],[34,24,17,21,32],[38,32,28,31,37],[39,37,33,29,35],[36,35,26,20,27]]},

"J43" : {
"name":"Elongated Pentagonal Gyrobirotunda (J43)",
"category":["Johnson Solid"],
"vertex":[[-1.099924,-0.170755,-0.018241],[-1.015744,0.184543,-0.41657],[-0.979069,0.342745,0.098809],[-0.891012,-0.645186,-0.17075],[-0.854337,-0.486985,0.344629],[-0.754806,-0.070303,-0.81526],[-0.677717,-0.583103,-0.663335],[-0.65879,0.343875,0.53402],[-0.633951,0.443197,-0.698209],[-0.581702,-0.168926,0.685945],[-0.57461,0.699173,0.135692],[-0.43213,-0.899333,-0.300465],[-0.37279,-0.643357,0.533436],[-0.361315,0.761256,-0.356893],[-0.295924,-0.324449,-0.944974],[-0.185624,0.480819,0.756166],[-0.111851,-0.898203,0.134746],[-0.108536,-0.031982,0.908091],[-0.101444,0.836117,0.357838],[-0.100377,0.50641,-0.755583],[0.100376,-0.506413,0.755582],[0.101443,-0.83612,-0.357838],[0.108535,0.031979,-0.908092],[0.111851,0.8982,-0.134747],[0.185623,-0.480822,-0.756167],[0.295923,0.324447,0.944974],[0.361314,-0.761258,0.356892],[0.372789,0.643354,-0.533437],[0.43213,0.899331,0.300464],[0.574609,-0.699176,-0.135692],[0.581701,0.168923,-0.685946],[0.63395,-0.443199,0.698208],[0.658789,-0.343878,-0.534021],[0.677716,0.583101,0.663334],[0.754804,0.0703,0.815259],[0.854336,0.486982,-0.344629],[0.891011,0.645184,0.17075],[0.979068,-0.342747,-0.09881],[1.015743,-0.184545,0.416569],[1.099923,0.170753,0.018241]],
"edge":[[0,1],[1,5],[5,6],[6,3],[3,0],[0,4],[4,9],[9,7],[7,2],[2,0],[2,1],[7,10],[10,2],[10,13],[13,8],[8,1],[8,5],[13,19],[19,8],[19,22],[22,14],[14,5],[14,6],[22,24],[24,14],[24,21],[21,11],[11,6],[11,3],[21,16],[16,11],[16,12],[12,4],[4,3],[12,9],[33,34],[34,38],[38,39],[39,36],[36,33],[33,28],[28,18],[18,15],[15,25],[25,33],[25,34],[15,17],[17,25],[17,20],[20,31],[31,34],[31,38],[20,26],[26,31],[26,29],[29,37],[37,38],[37,39],[29,32],[32,37],[32,30],[30,35],[35,39],[35,36],[30,27],[27,35],[27,23],[23,28],[28,36],[23,18],[24,32],[29,21],[26,16],[20,12],[17,9],[15,7],[18,10],[23,13],[27,19],[30,22]],
"face":[[0,2,1],[2,7,10],[1,8,5],[8,13,19],[5,14,6],[14,22,24],[6,11,3],[11,21,16],[3,4,0],[4,12,9],[33,25,34],[25,15,17],[34,31,38],[31,20,26],[38,37,39],[37,29,32],[39,35,36],[35,30,27],[36,28,33],[28,23,18],[24,32,29,21],[21,29,26,16],[16,26,20,12],[12,20,17,9],[9,17,15,7],[7,15,18,10],[10,18,23,13],[13,23,27,19],[19,27,30,22],[22,30,32,24],[0,1,5,6,3],[0,4,9,7,2],[1,2,10,13,8],[5,8,19,22,14],[6,14,24,21,11],[3,11,16,12,4],[33,34,38,39,36],[33,28,18,15,25],[34,25,17,20,31],[38,31,26,29,37],[39,37,32,30,35],[36,35,27,23,28]]},

"J44" : {
"name":"Gyroelongated Triangular Bicupola (J44)",
"category":["Johnson Solid"],
"vertex":[[-0.789003,0.385273,-0.254111],[-0.772339,-0.452189,-0.185879],[-0.761383,0.026005,0.505125],[-0.611639,-0.798949,0.562592],[-0.381598,-0.074991,-0.82722],[-0.362623,0.753266,0.369634],[-0.289802,0.760316,-0.816621],[-0.055737,-0.771195,-0.487529],[-0.033826,0.185193,0.894479],[0.104963,-1.117956,0.260942],[0.115918,-0.639761,0.951946],[0.136578,1.128308,-0.192876],[0.452187,-0.167262,-0.776585],[0.471162,0.660994,0.420269],[0.543983,0.668044,-0.765985],[0.67182,-0.612007,-0.098176],[0.682775,-0.133813,0.592828],[0.878567,0.200731,-0.15284]],
"edge":[[11,14],[14,6],[6,11],[11,13],[13,17],[17,14],[17,12],[12,14],[12,4],[4,6],[4,0],[0,6],[0,5],[5,11],[5,13],[9,10],[10,3],[3,9],[9,15],[15,16],[16,10],[16,8],[8,10],[8,2],[2,3],[2,1],[1,3],[1,7],[7,9],[7,15],[4,1],[1,0],[2,0],[2,5],[8,5],[8,13],[16,13],[16,17],[15,17],[15,12],[7,12],[7,4]],
"face":[[11,14,6],[14,17,12],[6,4,0],[11,5,13],[9,10,3],[10,16,8],[3,2,1],[9,7,15],[4,1,0],[0,1,2],[0,2,5],[5,2,8],[5,8,13],[13,8,16],[13,16,17],[17,16,15],[17,15,12],[12,15,7],[12,7,4],[4,7,1],[14,11,13,17],[6,14,12,4],[11,6,0,5],[10,9,15,16],[3,10,8,2],[9,3,1,7]]},

"J45" : {
"name":"Gyroelongated Square Bicupola (J45)",
"category":["Johnson Solid"],
"vertex":[[-0.984615,-0.215433,0.042813],[-0.835086,0.417027,0.382665],[-0.776626,0.078669,-0.596021],[-0.681291,-0.220722,0.710519],[-0.642753,-0.628915,-0.457214],[-0.627097,0.71113,-0.256169],[-0.577202,-0.786781,0.255979],[-0.300907,0.381853,0.883943],[-0.281757,0.897979,0.36326],[-0.143631,0.126378,-0.963315],[-0.068623,-0.621064,0.757726],[-0.049613,-0.984736,-0.213412],[-0.009758,-0.581206,-0.824509],[0.005899,0.758839,-0.623463],[0.311761,-0.018489,0.931151],[0.341127,0.667962,0.674663],[0.351238,0.945688,-0.004035],[0.458966,-0.819019,0.288335],[0.54357,-0.100253,-0.843914],[0.592421,-0.698626,-0.422693],[0.6931,0.532207,-0.504062],[0.83935,-0.216444,0.461759],[0.868716,0.470008,0.205272],[0.972805,-0.096052,-0.249268]],
"edge":[[5,13],[13,9],[9,2],[2,5],[5,8],[8,16],[16,13],[16,20],[20,13],[20,18],[18,9],[18,12],[12,9],[12,4],[4,2],[4,0],[0,2],[0,1],[1,5],[1,8],[21,14],[14,10],[10,17],[17,21],[21,22],[22,15],[15,14],[15,7],[7,14],[7,3],[3,10],[3,6],[6,10],[6,11],[11,17],[11,19],[19,17],[19,23],[23,21],[23,22],[12,11],[11,4],[6,4],[6,0],[3,0],[3,1],[7,1],[7,8],[15,8],[15,16],[22,16],[22,20],[23,20],[23,18],[19,18],[19,12]],
"face":[[13,16,20],[9,18,12],[2,4,0],[5,1,8],[14,15,7],[10,3,6],[17,11,19],[21,23,22],[12,11,4],[4,11,6],[4,6,0],[0,6,3],[0,3,1],[1,3,7],[1,7,8],[8,7,15],[8,15,16],[16,15,22],[16,22,20],[20,22,23],[20,23,18],[18,23,19],[18,19,12],[12,19,11],[5,13,9,2],[13,5,8,16],[9,13,20,18],[2,9,12,4],[5,2,0,1],[21,14,10,17],[14,21,22,15],[10,14,7,3],[17,10,6,11],[21,17,19,23]]},

"J46" : {
"name":"Gyroelongated Pentagonal Bicupola (J46)",
"category":["Johnson Solid"],
"vertex":[[-0.962816,0.187793,0.445444],[-0.942301,-0.435696,0.287991],[-0.736715,0.34226,-0.136766],[-0.7162,-0.281228,-0.294218],[-0.680334,0.758077,0.35095],[-0.653736,-0.229833,0.824928],[-0.626624,-0.874236,-0.061265],[-0.516012,0.397771,0.858028],[-0.47699,-0.788175,0.558536],[-0.259134,0.641512,-0.447112],[-0.22594,-0.367313,-0.701875],[-0.202753,1.057329,0.040605],[-0.136364,-0.960322,-0.468922],[-0.116423,0.854913,0.645191],[-0.053283,-1.063987,0.160603],[-0.029965,-0.362198,0.739264],[0.056543,0.202971,-0.796368],[0.107759,0.265405,0.772363],[0.287508,0.971244,-0.367052],[0.341218,-0.66107,-0.779268],[0.392401,0.966981,0.267715],[0.393741,-0.638011,0.341331],[0.455541,-0.951919,-0.216873],[0.603185,0.532703,-0.716309],[0.616584,0.377473,0.394887],[0.6237,-0.090786,-0.873761],[0.79333,-0.180868,0.128495],[0.816108,0.691169,-0.130218],[0.85513,-0.494777,-0.42971],[0.992854,0.132827,-0.396611]],
"edge":[[2,9],[9,16],[16,10],[10,3],[3,2],[2,4],[4,11],[11,9],[11,18],[18,9],[18,23],[23,16],[23,25],[25,16],[25,19],[19,10],[19,12],[12,10],[12,6],[6,3],[6,1],[1,3],[1,0],[0,2],[0,4],[24,17],[17,15],[15,21],[21,26],[26,24],[24,20],[20,13],[13,17],[13,7],[7,17],[7,5],[5,15],[5,8],[8,15],[8,14],[14,21],[14,22],[22,21],[22,28],[28,26],[28,29],[29,26],[29,27],[27,24],[27,20],[19,22],[22,12],[14,12],[14,6],[8,6],[8,1],[5,1],[5,0],[7,0],[7,4],[13,4],[13,11],[20,11],[20,18],[27,18],[27,23],[29,23],[29,25],[28,25],[28,19]],
"face":[[9,11,18],[16,23,25],[10,19,12],[3,6,1],[2,0,4],[17,13,7],[15,5,8],[21,14,22],[26,28,29],[24,27,20],[19,22,12],[12,22,14],[12,14,6],[6,14,8],[6,8,1],[1,8,5],[1,5,0],[0,5,7],[0,7,4],[4,7,13],[4,13,11],[11,13,20],[11,20,18],[18,20,27],[18,27,23],[23,27,29],[23,29,25],[25,29,28],[25,28,19],[19,28,22],[9,2,4,11],[16,9,18,23],[10,16,25,19],[3,10,12,6],[2,3,1,0],[17,24,20,13],[15,17,7,5],[21,15,8,14],[26,21,22,28],[24,26,29,27],[2,9,16,10,3],[24,17,15,21,26]]},

"J47" : {
"name":"Gyroelongated Pentagonal Cupolarotunda (J47)",
"category":["Johnson Solid"],
"vertex":[[-0.908535,-0.523787,-0.144699],[-0.894854,-0.367641,0.429886],[-0.853258,0.048135,-0.301436],[-0.839577,0.20428,0.273149],[-0.708763,-0.381742,-0.687498],[-0.672946,0.027052,0.816785],[-0.520247,-0.782937,0.225153],[-0.51634,0.434114,-0.605119],[-0.494204,0.686763,0.324579],[-0.422413,-0.79035,-0.362291],[-0.396391,-0.493344,0.730635],[-0.371845,0.004237,-0.991181],[-0.327573,0.509534,0.868216],[-0.294432,0.828807,-0.218221],[-0.140258,-0.512752,-0.807313],[-0.098153,-0.032185,0.961078],[-0.026471,0.486719,-0.939751],[-0.010949,-1.005224,0.010862],[0.009345,0.895513,0.564533],[0.189455,-0.536653,0.828749],[0.195436,0.881412,-0.552852],[0.209117,1.037558,0.021734],[0.218444,-0.056175,-0.93993],[0.260549,0.424392,0.828462],[0.427671,-0.853012,0.383905],[0.445587,-0.556061,-0.709199],[0.516681,0.404984,-0.709486],[0.525505,-0.860425,-0.203539],[0.542703,0.70199,0.38344],[0.640537,0.694577,-0.204005],[0.725908,-0.391854,0.614349],[0.769847,0.202104,0.614171],[0.884207,-0.403849,-0.336156],[0.928145,0.190109,-0.336334],[1.008063,-0.114255,0.169326]],
"edge":[[3,8],[8,13],[13,7],[7,2],[2,3],[3,5],[5,12],[12,8],[12,18],[18,8],[18,21],[21,13],[21,20],[20,13],[20,16],[16,7],[16,11],[11,7],[11,4],[4,2],[4,0],[0,2],[0,1],[1,3],[1,5],[30,24],[24,27],[27,32],[32,34],[34,30],[30,31],[31,23],[23,15],[15,19],[19,30],[19,24],[15,10],[10,19],[10,6],[6,17],[17,24],[17,27],[6,9],[9,17],[9,14],[14,25],[25,27],[25,32],[14,22],[22,25],[22,26],[26,33],[33,32],[33,34],[26,29],[29,33],[29,28],[28,31],[31,34],[28,23],[16,22],[22,11],[14,11],[14,4],[9,4],[9,0],[6,0],[6,1],[10,1],[10,5],[15,5],[15,12],[23,12],[23,18],[28,18],[28,21],[29,21],[29,20],[26,20],[26,16]],
"face":[[8,12,18],[13,21,20],[7,16,11],[2,4,0],[3,1,5],[30,19,24],[19,15,10],[24,17,27],[17,6,9],[27,25,32],[25,14,22],[32,33,34],[33,26,29],[34,31,30],[31,28,23],[16,22,11],[11,22,14],[11,14,4],[4,14,9],[4,9,0],[0,9,6],[0,6,1],[1,6,10],[1,10,5],[5,10,15],[5,15,12],[12,15,23],[12,23,18],[18,23,28],[18,28,21],[21,28,29],[21,29,20],[20,29,26],[20,26,16],[16,26,22],[8,3,5,12],[13,8,18,21],[7,13,20,16],[2,7,11,4],[3,2,0,1],[3,8,13,7,2],[30,24,27,32,34],[30,31,23,15,19],[24,19,10,6,17],[27,17,9,14,25],[32,25,22,26,33],[34,33,29,28,31]]},

"J48" : {
"name":"Gyroelongated Pentagonal Birotunda (J48)",
"category":["Johnson Solid"],
"vertex":[[-1.023844,0.34935,0.211966],[-1.02284,0.245289,-0.329944],[-0.984402,-0.132386,0.478181],[-0.982778,-0.300762,-0.398647],[-0.959023,-0.534178,0.100801],[-0.762835,0.690856,-0.134076],[-0.724398,0.313181,0.674049],[-0.72177,0.040743,-0.74469],[-0.659577,-0.570348,0.562884],[-0.657953,-0.738723,-0.313945],[-0.302078,0.865747,0.11414],[-0.301074,0.761686,-0.427769],[-0.278322,0.632332,0.613589],[-0.275694,0.359894,-0.805149],[-0.238881,0.150594,0.879804],[-0.235633,-0.186157,-0.873853],[-0.198819,-0.395456,0.8111],[-0.196192,-0.667893,-0.607638],[-0.173439,-0.797247,0.43372],[-0.172436,-0.901309,-0.10819],[0.169627,0.892069,-0.170988],[0.181588,0.824063,0.376487],[0.183498,0.626126,-0.654287],[0.214813,0.448086,0.77902],[0.217902,0.127816,-0.888807],[0.25661,-0.092255,0.882858],[0.259699,-0.412524,-0.784969],[0.291015,-0.590564,0.648338],[0.292924,-0.788502,-0.382436],[0.304885,-0.856507,0.165038],[0.65102,0.715912,-0.375257],[0.670374,0.605876,0.510575],[0.706688,-0.090371,-0.754719],[0.738003,-0.268411,0.678589],[0.760446,-0.698716,-0.103406],[0.960498,0.539035,0.045972],[0.974369,0.273093,-0.437327],[0.993723,0.163058,0.448505],[1.016166,-0.267247,-0.333489],[1.028128,-0.335253,0.213985]],
"edge":[[0,1],[1,3],[3,4],[4,2],[2,0],[0,6],[6,12],[12,10],[10,5],[5,0],[5,1],[10,11],[11,5],[11,13],[13,7],[7,1],[7,3],[13,15],[15,7],[15,17],[17,9],[9,3],[9,4],[17,19],[19,9],[19,18],[18,8],[8,4],[8,2],[18,16],[16,8],[16,14],[14,6],[6,2],[14,12],[35,37],[37,39],[39,38],[38,36],[36,35],[35,30],[30,20],[20,21],[21,31],[31,35],[31,37],[21,23],[23,31],[23,25],[25,33],[33,37],[33,39],[25,27],[27,33],[27,29],[29,34],[34,39],[34,38],[29,28],[28,34],[28,26],[26,32],[32,38],[32,36],[26,24],[24,32],[24,22],[22,30],[30,36],[22,20],[17,28],[28,19],[29,19],[29,18],[27,18],[27,16],[25,16],[25,14],[23,14],[23,12],[21,12],[21,10],[20,10],[20,11],[22,11],[22,13],[24,13],[24,15],[26,15],[26,17]],
"face":[[0,5,1],[5,10,11],[1,7,3],[7,13,15],[3,9,4],[9,17,19],[4,8,2],[8,18,16],[2,6,0],[6,14,12],[35,31,37],[31,21,23],[37,33,39],[33,25,27],[39,34,38],[34,29,28],[38,32,36],[32,26,24],[36,30,35],[30,22,20],[17,28,19],[19,28,29],[19,29,18],[18,29,27],[18,27,16],[16,27,25],[16,25,14],[14,25,23],[14,23,12],[12,23,21],[12,21,10],[10,21,20],[10,20,11],[11,20,22],[11,22,13],[13,22,24],[13,24,15],[15,24,26],[15,26,17],[17,26,28],[0,1,3,4,2],[0,6,12,10,5],[1,5,11,13,7],[3,7,15,17,9],[4,9,19,18,8],[2,8,16,14,6],[35,37,39,38,36],[35,30,20,21,31],[37,31,23,25,33],[39,33,27,29,34],[38,34,28,26,32],[36,32,24,22,30]]},

"J49" : {
"name":"Augmented Triangular Prism (J49)",
"category":["Johnson Solid"],
"vertex":[[-0.87547,-0.255205,-0.086794],[-0.276612,-0.313401,1.029989],[-0.236035,0.801921,-0.374595],[-0.051128,-0.255205,-1.050994],[0.218493,-0.889481,0.014004],[0.362823,0.743725,0.742188],[0.857929,0.167645,-0.273797]],
"edge":[[2,0],[0,1],[1,5],[5,2],[1,4],[4,6],[6,5],[6,3],[3,2],[2,6],[3,0],[3,4],[4,0]],
"face":[[6,3,2],[3,0,2],[0,3,4],[2,5,6],[1,0,4],[6,4,3],[2,0,1,5],[5,1,4,6]]},

"J50" : {
"name":"Biaugmented Triangular Prism (J50)",
"category":["Johnson Solid"],
"vertex":[[-0.878027,-0.44614,0.176652],[-0.85656,0.548188,-0.533],[-0.47761,0.616903,0.626496],[-0.069889,-0.364329,-0.736024],[0.239836,-0.921955,0.306031],[0.330528,0.698715,-0.286179],[0.640253,0.141088,0.755876],[1.071468,-0.272471,-0.309853]],
"edge":[[0,4],[4,6],[6,2],[2,0],[3,0],[0,1],[1,3],[2,1],[2,5],[5,1],[3,4],[6,5],[3,7],[7,4],[7,6],[7,5],[3,5]],
"face":[[3,0,1],[1,0,2],[1,2,5],[4,0,3],[2,6,5],[4,3,7],[4,7,6],[6,7,5],[7,3,5],[1,5,3],[0,4,6,2]]},

"J51" : {
"name":"Triaugmented Triangular Prism (J51)",
"category":["Johnson Solid"],
"vertex":[[-0.837735,-0.140456,-0.298855],[-0.67808,0.951266,0.116678],[-0.424767,0.019903,0.793738],[-0.041529,-0.887587,0.145967],[-0.017092,-0.613922,-1.000561],[0.031619,0.531638,-0.726088],[0.444587,0.691997,0.366504],[0.695172,-0.337344,0.883883],[0.827825,-0.215493,-0.281266]],
"edge":[[1,5],[5,0],[0,1],[8,4],[4,5],[5,8],[4,0],[4,3],[3,0],[8,3],[5,6],[6,8],[6,7],[7,8],[7,3],[7,2],[2,3],[6,2],[2,0],[2,1],[6,1]],
"face":[[1,5,0],[8,4,5],[4,0,5],[4,3,0],[8,3,4],[5,6,8],[8,6,7],[8,7,3],[3,7,2],[7,6,2],[3,2,0],[0,2,1],[2,6,1],[1,6,5]]},

"J52" : {
"name":"Augmented Pentagonal Prism (J52)",
"category":["Johnson Solid"],
"vertex":[[-0.81481,0.221521,-0.662951],[-0.660297,-0.683519,-0.326712],[-0.53073,0.852939,0.027439],[-0.280723,-0.611446,0.571485],[-0.200646,0.338137,0.790362],[0.085423,0.233517,-1.044348],[0.239936,-0.671523,-0.708109],[0.369503,0.864935,-0.353959],[0.473247,-0.295241,1.107742],[0.619511,-0.59945,0.190087],[0.699587,0.350133,0.408964]],
"edge":[[0,1],[1,3],[3,4],[4,2],[2,0],[7,10],[10,9],[9,6],[6,5],[5,7],[0,5],[6,1],[9,3],[4,10],[7,2],[3,8],[8,4],[9,8],[8,10]],
"face":[[3,8,4],[3,9,8],[4,8,10],[10,8,9],[1,0,5,6],[3,1,6,9],[2,4,10,7],[0,2,7,5],[0,1,3,4,2],[7,10,9,6,5]]},

"J53" : {
"name":"Biaugmented Pentagonal Prism (J53)",
"category":["Johnson Solid"],
"vertex":[[-0.736376,0.261231,-0.409511],[-0.572247,-0.640818,-0.200191],[-0.430826,0.786388,0.30833],[-0.352398,1.103933,-0.573408],[-0.16526,-0.673158,0.647018],[-0.077857,0.208904,0.961301],[0.083202,-1.290119,-0.017868],[0.11049,0.32145,-0.814035],[0.274618,-0.5806,-0.604714],[0.416039,0.846607,-0.096194],[0.681606,-0.61294,0.242494],[0.769009,0.269122,0.556777]],
"edge":[[4,5],[5,2],[2,0],[0,1],[1,4],[8,7],[7,9],[9,11],[11,10],[10,8],[4,10],[11,5],[9,2],[0,7],[8,1],[2,3],[3,0],[9,3],[3,7],[1,6],[6,4],[8,6],[6,10]],
"face":[[2,3,0],[2,9,3],[0,3,7],[7,3,9],[1,6,4],[1,8,6],[4,6,10],[10,6,8],[5,4,10,11],[2,5,11,9],[1,0,7,8],[4,5,2,0,1],[8,7,9,11,10]]},

"J54" : {
"name":"Augmented Hexagonal Prism (J54)",
"category":["Johnson Solid"],
"vertex":[[-0.973522,0.38842,-0.100967],[-0.837708,-0.464036,-0.18462],[-0.457167,0.537479,-0.781617],[-0.449574,0.863826,0.400622],[-0.321353,-0.314977,-0.865269],[-0.177946,-0.841086,0.233318],[0.066781,1.012885,-0.280028],[0.210188,0.486776,0.818559],[0.338409,-0.692027,-0.447332],[0.346002,-0.365679,0.734907],[0.666998,-1.030797,0.280259],[0.726543,0.635835,0.13791],[0.862357,-0.216621,0.054258]],
"edge":[[0,1],[1,5],[5,9],[9,7],[7,3],[3,0],[11,12],[12,8],[8,4],[4,2],[2,6],[6,11],[0,2],[4,1],[8,5],[9,12],[11,7],[6,3],[5,10],[10,9],[8,10],[10,12]],
"face":[[5,10,9],[5,8,10],[9,10,12],[12,10,8],[1,0,2,4],[5,1,4,8],[7,9,12,11],[3,7,11,6],[0,3,6,2],[0,1,5,9,7,3],[11,12,8,4,2,6]]},

"J55" : {
"name":"Parabiaugmented Hexagonal Prism (J55)",
"category":["Johnson Solid"],
"vertex":[[-1.129559,0.266324,0.624401],[-0.925111,0.008507,-0.145991],[-0.655368,-0.416841,0.523404],[-0.5883,0.71007,0.164074],[-0.438148,0.074567,-0.824427],[-0.318557,0.284721,0.83347],[-0.101337,0.77613,-0.514362],[0.101337,-0.77613,0.514363],[0.318557,-0.284721,-0.833468],[0.438148,-0.074567,0.824429],[0.5883,-0.710069,-0.164073],[0.655368,0.416842,-0.523403],[0.925111,-0.008507,0.145993],[1.129559,-0.266324,-0.624399]],
"edge":[[5,9],[9,12],[12,11],[11,6],[6,3],[3,5],[4,8],[8,10],[10,7],[7,2],[2,1],[1,4],[5,2],[7,9],[10,12],[11,8],[4,6],[1,3],[12,13],[13,11],[10,13],[13,8],[3,0],[0,5],[1,0],[0,2]],
"face":[[12,13,11],[12,10,13],[11,13,8],[8,13,10],[3,0,5],[3,1,0],[5,0,2],[2,0,1],[9,5,2,7],[12,9,7,10],[6,11,8,4],[3,6,4,1],[5,9,12,11,6,3],[4,8,10,7,2,1]]},

"J56" : {
"name":"Metabiaugmented Hexagonal Prism (J56)",
"category":["Johnson Solid"],
"vertex":[[-1.111755,0.435562,-0.458586],[-0.808867,0.159752,0.27642],[-0.700013,-0.297342,-0.421621],[-0.454926,0.822531,-0.102389],[-0.346072,0.365437,-0.80043],[-0.331474,-0.383478,0.706586],[-0.22262,-0.840572,0.008545],[0.189019,-1.044602,0.713507],[0.376408,0.942079,-0.051032],[0.485263,0.484985,-0.749073],[0.49986,-0.26393,0.757943],[0.608714,-0.721024,0.059902],[0.853802,0.398849,0.379134],[0.962656,-0.058246,-0.318907]],
"edge":[[12,8],[8,3],[3,1],[1,5],[5,10],[10,12],[6,2],[2,4],[4,9],[9,13],[13,11],[11,6],[12,13],[9,8],[4,3],[1,2],[6,5],[10,11],[3,0],[0,1],[4,0],[0,2],[5,7],[7,10],[6,7],[7,11]],
"face":[[3,0,1],[3,4,0],[1,0,2],[2,0,4],[5,7,10],[5,6,7],[10,7,11],[11,7,6],[8,12,13,9],[3,8,9,4],[5,1,2,6],[12,10,11,13],[12,8,3,1,5,10],[6,2,4,9,13,11]]},

"J57" : {
"name":"Triaugmented Hexagonal Prism (J57)",
"category":["Johnson Solid"],
"vertex":[[-0.902174,-0.044182,-0.142406],[-0.852256,-0.16038,-0.950443],[-0.65694,0.352221,0.529639],[-0.484062,0.483825,-0.606421],[-0.454289,-0.660407,-0.440037],[-0.238829,0.880229,0.065624],[-0.184058,0.919718,0.880707],[-0.036177,-0.1324,-0.904053],[0.036178,0.1324,0.904052],[0.238829,-0.880229,-0.065625],[0.454289,0.660407,0.440037],[0.484063,-0.483825,0.60642],[0.656941,-0.352221,-0.52964],[0.902174,0.044182,0.142405],[1.036314,-0.759338,0.069736]],
"edge":[[0,4],[4,9],[9,11],[11,8],[8,2],[2,0],[10,13],[13,12],[12,7],[7,3],[3,5],[5,10],[4,7],[12,9],[11,13],[10,8],[2,5],[3,0],[9,14],[14,11],[12,14],[14,13],[8,6],[6,2],[10,6],[6,5],[0,1],[1,4],[3,1],[1,7]],
"face":[[9,14,11],[9,12,14],[11,14,13],[13,14,12],[8,6,2],[8,10,6],[2,6,5],[5,6,10],[0,1,4],[0,3,1],[4,1,7],[7,1,3],[9,4,7,12],[8,11,13,10],[0,2,5,3],[0,4,9,11,8,2],[10,13,12,7,3,5]]},

"J58" : {
"name":"Augmented Dodecahedron (J58)",
"category":["Johnson Solid"],
"vertex":[[-0.906673,0.136106,0.246909],[-0.827056,0.097501,-0.456089],[-0.822039,0.728118,-0.133084],[-0.682157,-0.474972,0.526574],[-0.553334,-0.537436,-0.610901],[-0.48677,0.654002,0.486704],[-0.463781,-0.891244,-0.003583],[-0.357947,0.591537,-0.650771],[-0.147639,0.935474,-0.068093],[-0.123496,-0.334743,0.939211],[-0.00274,0.363001,0.91457],[0.084945,-0.435813,-0.901263],[0.2057,0.261931,-0.925903],[0.229843,-1.008285,0.0814],[0.440151,-0.664349,0.664079],[0.545986,0.818432,0.01689],[0.568974,-0.726814,-0.473396],[0.635538,0.464625,0.624209],[0.764361,0.40216,-0.513266],[0.90926,-0.170313,0.469397],[0.988877,-0.208918,-0.233601]],
"edge":[[18,20],[20,16],[16,11],[11,12],[12,18],[6,4],[4,11],[16,13],[13,6],[1,7],[7,12],[4,1],[8,15],[15,18],[7,8],[17,19],[19,20],[15,17],[14,13],[19,14],[17,10],[10,9],[9,14],[8,5],[5,10],[6,3],[3,0],[0,1],[9,3],[5,0],[2,0],[5,2],[8,2],[2,1],[2,7]],
"face":[[2,0,5],[2,5,8],[2,1,0],[2,7,1],[7,2,8],[18,20,16,11,12],[6,4,11,16,13],[1,7,12,11,4],[8,15,18,12,7],[17,19,20,18,15],[14,13,16,20,19],[19,17,10,9,14],[15,8,5,10,17],[4,6,3,0,1],[13,14,9,3,6],[3,9,10,5,0]]},

"J59" : {
"name":"Parabiaugmented Dodecahedron (J59)",
"category":["Johnson Solid"],
"vertex":[[-0.987924,-0.168105,-0.565605],[-0.950092,-0.216897,0.133657],[-0.877263,0.407337,-0.179083],[-0.637339,-0.699196,-0.269274],[-0.609869,-0.193139,0.747222],[-0.519498,0.310837,-0.775297],[-0.492028,0.816894,0.241199],[-0.371218,-0.373038,-0.831038],[-0.32677,0.445779,0.813687],[-0.103824,-0.973514,0.095267],[-0.086847,-0.660753,0.723496],[0.086847,0.660753,-0.723496],[0.103824,0.973513,-0.095267],[0.32677,-0.44578,-0.813687],[0.371218,0.373038,0.831038],[0.492028,-0.816894,-0.241199],[0.519498,-0.310837,0.775297],[0.609869,0.193139,-0.747222],[0.637339,0.699195,0.269274],[0.877262,-0.407338,0.179083],[0.950092,0.216897,-0.133657],[0.987924,0.168105,0.565605]],
"edge":[[6,8],[8,14],[14,18],[18,12],[12,6],[17,11],[11,12],[18,20],[20,17],[5,2],[2,6],[11,5],[1,4],[4,8],[2,1],[10,16],[16,14],[4,10],[1,3],[3,9],[9,10],[17,13],[13,7],[7,5],[20,19],[19,15],[15,13],[9,15],[19,16],[3,7],[0,7],[3,0],[1,0],[0,5],[0,2],[21,18],[14,21],[16,21],[21,20],[21,19]],
"face":[[0,7,3],[0,3,1],[0,5,7],[0,2,5],[2,0,1],[21,18,14],[21,14,16],[21,20,18],[21,19,20],[19,21,16],[6,8,14,18,12],[17,11,12,18,20],[5,2,6,12,11],[1,4,8,6,2],[10,16,14,8,4],[4,1,3,9,10],[11,17,13,7,5],[20,19,15,13,17],[16,10,9,15,19],[15,9,3,7,13]]},


"J60" : {
"name":"Metabiaugmented Dodecahedron (J60)",
"category":["Johnson Solid"],
"vertex":[[-0.858966,-0.256781,-0.362035],[-0.807204,-0.391109,0.326114],[-0.719263,0.425042,-0.461407],[-0.63551,0.207695,0.652043],[-0.58116,0.712103,0.165328],[-0.46306,-0.410585,0.938862],[-0.364654,-0.630479,-0.694119],[-0.311484,0.996138,-0.418515],[-0.280902,-0.847826,0.419331],[-0.13861,0.472734,-0.854906],[-0.007391,-0.995764,-0.211209],[-0.003096,0.121058,0.946694],[0.08055,-0.179614,-0.99873],[0.084846,0.937209,0.159173],[0.216065,-0.531289,0.80287],[0.358357,0.789271,-0.471366],[0.442109,0.571923,0.642084],[0.658614,-0.770659,-0.217364],[0.712965,-0.26625,-0.704079],[0.796718,-0.483597,0.409371],[0.884659,0.332554,-0.37815],[0.936421,0.198226,0.31]],
"edge":[[0,6],[6,10],[10,8],[8,1],[1,0],[19,14],[14,8],[10,17],[17,19],[4,2],[2,0],[1,3],[3,4],[9,12],[12,6],[2,9],[18,17],[12,18],[9,15],[15,20],[20,18],[3,11],[11,16],[16,13],[13,4],[19,21],[21,16],[11,14],[20,21],[15,13],[7,13],[15,7],[9,7],[7,4],[7,2],[5,1],[8,5],[14,5],[5,3],[5,11]],
"face":[[7,13,15],[7,15,9],[7,4,13],[7,2,4],[2,7,9],[5,1,8],[5,8,14],[5,3,1],[5,11,3],[11,5,14],[0,6,10,8,1],[19,14,8,10,17],[4,2,0,1,3],[9,12,6,0,2],[18,17,10,6,12],[12,9,15,20,18],[3,11,16,13,4],[14,19,21,16,11],[17,18,20,21,19],[21,20,15,13,16]]},

"J61" : {
"name":"Triaugmented Dodecahedron (J61)",
"category":["Johnson Solid"],
"vertex":[[-0.875027,-0.215344,-0.354115],[-0.822602,-0.401147,0.315989],[-0.733096,0.465836,-0.400606],[-0.648272,0.1652,0.683645],[-0.625957,0.049095,-0.949385],[-0.592955,0.701024,0.240765],[-0.479753,-0.469083,0.919437],[-0.387571,-0.561993,-0.712628],[-0.302747,-0.862629,0.371622],[-0.157924,0.540178,-0.787852],[-0.033883,-0.962037,-0.264098],[-0.020675,0.053739,0.966503],[0.055623,-0.095055,-0.980693],[0.068831,0.920721,0.249908],[0.192872,-0.581494,0.773662],[0.337694,0.821313,-0.385812],[0.422519,0.520677,0.698439],[0.627903,-0.74234,-0.254955],[0.683221,-0.206515,-0.697835],[0.756251,0.83314,0.171845],[0.768045,-0.507151,0.386416],[0.85755,0.359831,-0.330178],[0.909975,0.174028,0.339925]],
"edge":[[20,17],[17,18],[18,21],[21,22],[22,20],[9,15],[15,21],[18,12],[12,9],[11,14],[14,20],[22,16],[16,11],[8,10],[10,17],[14,8],[7,12],[10,7],[8,1],[1,0],[0,7],[16,13],[13,5],[5,3],[3,11],[9,2],[2,5],[13,15],[2,0],[1,3],[6,3],[1,6],[8,6],[6,11],[6,14],[19,22],[21,19],[15,19],[19,16],[19,13],[4,0],[2,4],[9,4],[4,7],[4,12]],
"face":[[6,3,1],[6,1,8],[6,11,3],[6,14,11],[14,6,8],[19,22,21],[19,21,15],[19,16,22],[19,13,16],[13,19,15],[4,0,2],[4,2,9],[4,7,0],[4,12,7],[12,4,9],[20,17,18,21,22],[9,15,21,18,12],[11,14,20,22,16],[8,10,17,20,14],[7,12,18,17,10],[10,8,1,0,7],[16,13,5,3,11],[15,9,2,5,13],[2,0,1,3,5]]},

"J62" : {
"name":"Metabidiminished Icosahedron (J62)",
"category":["Johnson Solid"],
"vertex":[[-0.821855,0.223834,-0.340481],[-0.71039,-0.701977,0.157898],[-0.692806,0.20039,0.708676],[-0.215696,-0.533443,-0.761235],[-0.187244,0.926618,0.129942],[-0.006891,-0.571377,0.936336],[0.107626,0.473083,-0.778513],[0.793541,-0.298683,-0.550854],[0.811125,0.603684,-0.000076],[0.92259,-0.322128,0.498303]],
"edge":[[1,3],[3,7],[7,9],[9,5],[5,1],[2,5],[9,8],[8,4],[4,2],[6,3],[3,0],[0,6],[1,0],[2,1],[2,0],[4,0],[8,6],[6,4],[7,8],[7,6]],
"face":[[6,3,0],[0,3,1],[1,5,2],[1,2,0],[2,4,0],[4,8,6],[4,6,0],[9,7,8],[7,6,8],[7,3,6],[1,3,7,9,5],[2,5,9,8,4]]},

"J63" : {
"name":"Tridiminished Icosahedron (J63)",
"category":["Johnson Solid"],
"vertex":[[-0.799898,0.494585,-0.153719],[-0.680241,-0.086273,0.717027],[-0.306176,0.002547,-0.943688],[-0.112567,-0.9373,0.465209],[-0.077419,0.764103,0.564122],[0.118618,-0.882406,-0.56117],[0.153766,0.818996,-0.462256],[0.841097,-0.612888,0.156672],[0.86282,0.438637,0.217804]],
"edge":[[6,8],[8,7],[7,5],[5,2],[2,6],[0,2],[5,3],[3,1],[1,0],[0,4],[4,6],[6,0],[4,8],[1,4],[3,7]],
"face":[[0,4,6],[4,8,6],[6,2,0],[0,1,4],[5,7,3],[6,8,7,5,2],[0,2,5,3,1],[7,8,4,1,3]]},

"J64" : {
"name":"Augmented Tridiminished Icosahedron (J64)",
"category":["Johnson Solid"],
"vertex":[[-0.777985,-0.188235,-0.285228],[-0.489362,-0.260552,0.643961],[-0.32442,0.578558,-0.683014],[-0.099589,-0.843165,-0.034687],[0.142581,0.461547,0.820446],[0.24452,0.980145,0.00033],[0.634293,0.397531,-0.678318],[0.773247,-0.481142,-0.27763],[0.922916,0.325215,0.250871],[-1.026197,-0.969903,0.24327]],
"edge":[[8,4],[4,1],[1,3],[3,7],[7,8],[6,7],[3,0],[0,2],[2,6],[6,5],[5,8],[8,6],[5,4],[2,5],[0,1],[9,1],[0,9],[3,9]],
"face":[[6,5,8],[5,4,8],[8,7,6],[6,2,5],[9,1,0],[9,0,3],[9,3,1],[8,4,1,3,7],[6,7,3,0,2],[1,4,5,2,0]]},

"J65" : {
"name":"Augmented Truncated Tetrahedron (J65)",
"category":["Johnson Solid"],
"vertex":[[-0.91403,0.409064,-0.602734],[-0.830829,0.815648,0.102539],[-0.699591,-0.379344,-0.648261],[-0.533188,0.433825,0.762285],[-0.401951,-0.761167,0.011485],[-0.338469,0.986004,-0.528495],[-0.318749,-0.354582,0.716757],[0.090409,-0.59081,-0.619549],[0.251663,-0.893891,0.485632],[0.256812,0.222359,0.790997],[0.451531,0.774538,-0.499782],[0.66597,-0.013869,-0.545309],[0.744023,-0.723534,-0.145401],[0.749172,0.392715,0.159963],[0.827225,-0.31695,0.559871]],
"edge":[[12,8],[8,4],[4,7],[7,12],[7,11],[11,12],[7,2],[2,0],[0,5],[5,10],[10,11],[10,13],[13,11],[13,14],[14,12],[13,9],[9,14],[5,1],[1,3],[3,9],[3,6],[6,9],[0,1],[2,4],[4,6],[6,8],[8,14]],
"face":[[12,7,11],[10,13,11],[14,13,9],[9,3,6],[0,1,5],[4,2,7],[6,4,8],[14,8,12],[12,8,4,7],[13,14,12,11],[14,9,6,8],[11,7,2,0,5,10],[13,10,5,1,3,9],[3,1,0,2,4,6]]},

"J66" : {
"name":"Augmented Truncated Cube (J66)",
"category":["Johnson Solid"],
"vertex":[[-0.935384,0.507278,-0.272116],[-0.915801,0.536228,0.283002],[-0.882043,0.099694,-0.646826],[-0.834764,0.169584,0.693348],[-0.787023,-0.447768,-0.621628],[-0.739744,-0.377878,0.718546],[-0.705986,-0.814411,-0.211282],[-0.686402,-0.785462,0.343836],[-0.561956,0.553237,-0.681771],[-0.514677,0.623127,0.658404],[-0.332557,-0.768453,-0.620937],[-0.285278,-0.698562,0.719237],[-0.014265,0.647182,-0.705992],[0.033015,0.717073,0.634183],[0.215134,-0.674508,-0.645158],[0.262413,-0.604617,0.695016],[0.386859,0.734081,-0.330591],[0.406443,0.763031,0.224528],[0.440201,0.326497,-0.705301],[0.48748,0.396388,0.634874],[0.535221,-0.220964,-0.680103],[0.5825,-0.151074,0.660072],[0.616258,-0.587608,-0.269757],[0.635842,-0.558659,0.285361],[0.831438,0.541255,-0.057559],[0.884779,0.13367,-0.432269],[0.912475,0.174611,0.352787],[0.965816,-0.232973,-0.021924]],
"edge":[[25,24],[24,26],[26,27],[27,25],[25,18],[18,16],[16,24],[16,17],[17,24],[17,19],[19,26],[19,21],[21,26],[21,23],[23,27],[23,22],[22,27],[22,20],[20,25],[20,18],[23,15],[15,11],[11,7],[7,6],[6,10],[10,14],[14,22],[20,14],[10,4],[4,2],[2,8],[8,12],[12,18],[16,12],[8,0],[0,1],[1,9],[9,13],[13,17],[19,13],[9,3],[3,5],[5,11],[15,21],[4,6],[7,5],[3,1],[0,2]],
"face":[[24,16,17],[26,19,21],[27,23,22],[25,20,18],[21,15,23],[5,7,11],[17,13,19],[1,3,9],[18,12,16],[2,0,8],[22,14,20],[6,4,10],[25,24,26,27],[24,25,18,16],[26,24,17,19],[27,26,21,23],[25,27,22,20],[23,15,11,7,6,10,14,22],[20,14,10,4,2,8,12,18],[16,12,8,0,1,9,13,17],[19,13,9,3,5,11,15,21],[4,6,7,5,3,1,0,2]]},

"J67" : {
"name":"Biaugmented Truncated Cube (J67)",
"category":["Johnson Solid"],
"vertex":[[-0.85468,-0.304544,0.321795],[-0.813538,0.214997,0.467663],[-0.753988,-0.584165,-0.130495],[-0.662946,-0.809677,0.352981],[-0.654663,0.670118,0.221662],[-0.570447,-0.460068,-0.624262],[-0.567052,-0.168344,0.759532],[-0.471123,0.794216,-0.272106],[-0.411573,-0.004947,-0.870263],[-0.375319,-0.673477,0.790718],[-0.370431,0.514594,-0.724396],[-0.323962,-0.84341,-0.332393],[-0.23292,-1.068921,0.151083],[-0.183495,0.930415,0.165631],[-0.059594,-0.25535,0.926295],[-0.054707,0.932721,-0.588818],[0.054707,-0.932721,0.588819],[0.059595,0.25535,-0.926294],[0.183496,-0.930415,-0.16563],[0.23292,1.068921,-0.151082],[0.323962,0.84341,0.332394],[0.370432,-0.514594,0.724397],[0.37532,0.673477,-0.790717],[0.411574,0.004947,0.870264],[0.471123,-0.794216,0.272106],[0.567053,0.168344,-0.759531],[0.570448,0.460068,0.624263],[0.654664,-0.670118,-0.221661],[0.662947,0.809677,-0.35298],[0.753989,0.584165,0.130496],[0.813538,-0.214997,-0.467662],[0.85468,0.304544,-0.321795]],
"edge":[[28,22],[22,15],[15,19],[19,28],[28,31],[31,25],[25,22],[25,17],[17,22],[17,10],[10,15],[10,7],[7,15],[7,13],[13,19],[13,20],[20,19],[20,29],[29,28],[29,31],[16,9],[9,3],[3,12],[12,16],[16,21],[21,14],[14,9],[14,6],[6,9],[6,0],[0,3],[0,2],[2,3],[2,11],[11,12],[11,18],[18,12],[18,24],[24,16],[24,21],[13,4],[4,1],[1,6],[14,23],[23,26],[26,20],[29,26],[23,21],[24,27],[27,30],[30,31],[25,30],[27,18],[11,5],[5,8],[8,17],[10,8],[5,2],[0,1],[4,7]],
"face":[[22,25,17],[15,10,7],[19,13,20],[28,29,31],[9,14,6],[3,0,2],[12,11,18],[16,24,21],[7,4,13],[0,6,1],[17,8,10],[11,2,5],[31,30,25],[24,18,27],[20,26,29],[14,21,23],[28,22,15,19],[22,28,31,25],[15,22,17,10],[19,15,7,13],[28,19,20,29],[16,9,3,12],[9,16,21,14],[3,9,6,0],[12,3,2,11],[16,12,18,24],[13,4,1,6,14,23,26,20],[29,26,23,21,24,27,30,31],[25,30,27,18,11,5,8,17],[10,8,5,2,0,1,4,7]]},

"J68" : {
"name":"Augmented Truncated Dodecahedron (J68)",
"category":["Johnson Solid"],
"vertex":[[-1.053731,-0.062801,0.140871],[-1.047729,-0.006643,-0.190675],[-0.967657,0.064553,0.440012],[-0.951944,0.211579,-0.427988],[-0.942283,-0.266176,0.38445],[-0.92657,-0.11915,-0.483549],[-0.822385,0.326776,0.592485],[-0.802963,0.50851,-0.480421],[-0.755954,-0.539085,0.447023],[-0.736532,-0.35735,-0.625883],[-0.673403,0.623707,0.540051],[-0.65769,0.770733,-0.327948],[-0.577618,0.841928,0.302738],[-0.571617,0.898087,-0.028808],[-0.565916,-0.777285,0.304689],[-0.561955,0.420332,0.78363],[-0.550203,-0.630259,-0.56331],[-0.536531,0.658225,-0.620822],[-0.479842,-0.64993,0.603829],[-0.454419,-0.412037,-0.800623],[-0.444757,-0.889793,0.011815],[-0.438755,-0.833633,-0.319731],[-0.311187,0.991643,0.162337],[-0.285843,0.309485,0.940436],[-0.254418,0.603538,-0.795562],[-0.219412,-0.556374,0.794974],[-0.187987,-0.262321,-0.941024],[-0.162643,-0.944479,-0.162925],[-0.099515,0.036577,1.003008],[-0.07414,-0.294152,0.947447],[-0.06438,0.365339,-0.937896],[-0.039006,0.034609,-0.993458],[0.024123,1.015665,0.172476],[0.049467,0.333508,0.950575],[0.080892,0.627561,-0.785423],[0.115898,-0.532352,0.805113],[0.147323,-0.238299,-0.930885],[0.172667,-0.920457,-0.152786],[0.300235,0.90482,0.329282],[0.306237,0.960979,-0.002264],[0.315898,0.483223,0.810173],[0.341322,0.721117,-0.594278],[0.398011,-0.587039,0.630373],[0.411683,0.701445,0.572861],[0.423435,-0.349145,-0.774079],[0.427396,0.848471,-0.295138],[0.433096,-0.826901,0.038358],[0.439098,-0.770742,-0.293188],[0.51917,-0.699547,0.337499],[0.534883,-0.55252,-0.5305],[0.598012,0.428536,0.635433],[0.617434,0.610271,-0.437472],[0.664443,-0.437324,0.489972],[0.683864,-0.255589,-0.582934],[0.721659,-0.657508,0.072275],[0.727661,-0.601349,-0.259271],[0.78805,0.190336,0.493099],[0.803762,0.337363,-0.3749],[0.813424,-0.140393,0.437538],[0.829136,0.006634,-0.430461],[0.866931,-0.395285,0.224748],[0.876642,-0.304418,-0.311705],[0.909209,0.077829,0.200225],[0.91521,0.133987,-0.131321],[0.962716,-0.177064,-0.012565]],
"edge":[[31,26],[26,19],[19,9],[9,5],[5,3],[3,7],[7,17],[17,24],[24,30],[30,31],[34,30],[24,34],[59,53],[53,44],[44,36],[36,31],[34,41],[41,51],[51,57],[57,59],[45,51],[41,45],[36,26],[37,27],[27,21],[21,16],[16,19],[44,49],[49,47],[47,37],[53,49],[16,9],[8,4],[4,0],[0,1],[1,5],[21,20],[20,14],[14,8],[27,20],[1,3],[10,12],[12,13],[13,11],[11,7],[0,2],[2,6],[6,10],[4,2],[11,17],[39,45],[13,22],[22,32],[32,39],[12,22],[50,40],[40,33],[33,28],[28,29],[29,35],[35,42],[42,52],[52,58],[58,56],[56,50],[62,56],[58,62],[39,38],[38,43],[43,50],[62,63],[63,57],[63,59],[43,40],[10,15],[15,23],[23,33],[38,32],[23,28],[8,18],[18,25],[25,29],[15,6],[25,35],[37,46],[46,48],[48,42],[18,14],[48,52],[47,46],[60,54],[54,55],[55,61],[61,64],[64,60],[60,52],[48,54],[46,54],[47,55],[49,55],[53,61],[59,61],[63,64],[62,64],[58,60]],
"face":[[34,30,24],[45,51,41],[36,26,31],[53,49,44],[16,9,19],[27,20,21],[1,3,5],[4,2,0],[11,17,7],[12,22,13],[62,56,58],[59,57,63],[43,40,50],[39,32,38],[23,28,33],[10,6,15],[25,35,29],[8,14,18],[48,52,42],[47,46,37],[54,48,46],[55,47,49],[61,53,59],[62,64,63],[60,58,52],[54,60,52,48],[55,54,46,47],[61,55,49,53],[64,61,59,63],[60,64,62,58],[60,54,55,61,64],[31,26,19,9,5,3,7,17,24,30],[59,53,44,36,31,30,34,41,51,57],[37,27,21,16,19,26,36,44,49,47],[8,4,0,1,5,9,16,21,20,14],[10,12,13,11,7,3,1,0,2,6],[39,45,41,34,24,17,11,13,22,32],[50,40,33,28,29,35,42,52,58,56],[45,39,38,43,50,56,62,63,57,51],[12,10,15,23,33,40,43,38,32,22],[4,8,18,25,29,28,23,15,6,2],[27,37,46,48,42,35,25,18,14,20]]},

"J69" : {
"name":"Parabiaugmented Truncated Dodecahedron (J69)",
"category":["Johnson Solid"],
"vertex":[[-0.988041,0.082361,-0.032394],[-0.940439,0.10562,0.297446],[-0.93903,-0.112232,-0.299475],[-0.911497,0.377114,0.10495],[-0.814408,-0.051339,0.564056],[-0.812127,-0.403831,-0.401783],[-0.783185,-0.132338,-0.594279],[-0.738637,0.65944,0.060095],[-0.658086,-0.328563,0.665601],[-0.655805,-0.681055,-0.300238],[-0.621075,-0.575598,-0.615315],[-0.592133,-0.304105,-0.807812],[-0.581542,-0.03381,0.802944],[-0.580033,0.029724,-0.8042],[-0.535485,0.821501,-0.149826],[-0.531183,-0.620162,0.563294],[-0.529773,-0.838014,-0.033627],[-0.487884,0.844761,0.180013],[-0.482172,-0.814755,0.296212],[-0.407173,0.31205,-0.849055],[-0.37964,0.801396,-0.44463],[-0.373928,-0.858119,-0.328432],[-0.339198,-0.752663,-0.643508],[-0.33079,0.15151,0.922864],[-0.330629,0.606803,-0.711711],[-0.292369,-0.313377,-0.954974],[-0.28027,0.020452,-0.951362],[-0.255019,0.862289,0.418901],[-0.249306,-0.797226,0.5351],[-0.157929,0.433837,0.878008],[-0.136047,-0.590601,-0.85343],[-0.128987,0.70533,0.685512],[-0.079877,0.792123,-0.591793],[-0.074164,-0.867392,-0.475594],[-0.001607,0.156613,0.979553],[0.001607,-0.156613,-0.979556],[0.074164,0.867391,0.475591],[0.079877,-0.792124,0.59179],[0.128987,-0.70533,-0.685515],[0.136047,0.590601,0.853427],[0.157929,-0.433837,-0.878011],[0.249306,0.797226,-0.535103],[0.255019,-0.862289,-0.418905],[0.280269,-0.020452,0.95136],[0.292369,0.313377,0.954971],[0.330629,-0.606803,0.711709],[0.33079,-0.151511,-0.922866],[0.339198,0.752662,0.643506],[0.373928,0.858119,0.328428],[0.37964,-0.801396,0.444627],[0.407172,-0.312051,0.849052],[0.482172,0.814754,-0.296215],[0.487884,-0.844761,-0.180016],[0.529773,0.838013,0.033625],[0.531183,0.620161,-0.563297],[0.535485,-0.821502,0.149823],[0.580033,-0.029724,0.804197],[0.581542,0.03381,-0.802948],[0.592133,0.304105,0.807809],[0.621074,0.575598,0.615313],[0.655804,0.681055,0.300235],[0.658086,0.328562,-0.665604],[0.738637,-0.65944,-0.060097],[0.783184,0.132337,0.594276],[0.812126,0.40383,0.40178],[0.814408,0.051338,-0.564059],[0.911497,-0.377114,-0.104953],[0.939029,0.112232,0.299472],[0.940439,-0.10562,-0.297449],[0.988041,-0.082361,0.032391]],
"edge":[[15,28],[28,37],[37,45],[45,50],[50,43],[43,34],[34,23],[23,12],[12,8],[8,15],[4,8],[12,4],[5,9],[9,16],[16,18],[18,15],[4,1],[1,0],[0,2],[2,5],[3,0],[1,3],[18,28],[42,52],[52,55],[55,49],[49,37],[16,21],[21,33],[33,42],[9,21],[49,45],[69,67],[67,63],[63,56],[56,50],[55,62],[62,66],[66,69],[52,62],[56,43],[69,68],[68,65],[65,61],[61,54],[54,51],[51,53],[53,60],[60,64],[64,67],[64,63],[29,23],[34,29],[7,3],[29,31],[31,27],[27,17],[17,7],[36,27],[31,36],[24,32],[32,41],[41,54],[61,57],[57,46],[46,35],[35,26],[26,19],[19,24],[13,19],[26,13],[7,14],[14,20],[20,24],[13,6],[6,2],[6,5],[20,32],[36,48],[48,53],[51,41],[14,17],[48,60],[65,57],[42,38],[38,40],[40,46],[68,66],[40,35],[33,38],[25,30],[30,22],[22,10],[10,11],[11,25],[25,35],[40,30],[38,30],[33,22],[21,22],[9,10],[5,10],[6,11],[13,11],[26,25],[44,58],[58,59],[59,47],[47,39],[39,44],[44,43],[56,58],[63,58],[64,59],[60,59],[48,47],[36,47],[31,39],[29,39],[34,44]],
"face":[[4,8,12],[3,0,1],[18,28,15],[9,21,16],[49,45,37],[52,62,55],[56,43,50],[64,63,67],[29,23,34],[36,27,31],[13,19,26],[5,2,6],[20,32,24],[7,17,14],[51,54,41],[60,53,48],[65,57,61],[69,66,68],[40,35,46],[33,38,42],[30,40,38],[22,33,21],[10,9,5],[13,11,6],[25,26,35],[58,56,63],[59,64,60],[47,48,36],[29,39,31],[44,34,43],[30,25,35,40],[22,30,38,33],[10,22,21,9],[11,10,5,6],[25,11,13,26],[58,44,43,56],[59,58,63,64],[47,59,60,48],[39,47,36,31],[44,39,29,34],[25,30,22,10,11],[44,58,59,47,39],[15,28,37,45,50,43,34,23,12,8],[5,9,16,18,15,8,4,1,0,2],[42,52,55,49,37,28,18,16,21,33],[69,67,63,56,50,45,49,55,62,66],[67,69,68,65,61,54,51,53,60,64],[7,3,1,4,12,23,29,31,27,17],[24,32,41,54,61,57,46,35,26,19],[3,7,14,20,24,19,13,6,2,0],[36,48,53,51,41,32,20,14,17,27],[52,42,38,40,46,57,65,68,66,62]]},

"J70" : {
"name":"Metabiaugmented Truncated Dodecahedron (J70)",
"category":["Johnson Solid"],
"vertex":[[-0.989194,-0.091477,-0.102373],[-0.986156,-0.109996,0.232129],[-0.908902,0.23333,-0.08512],[-0.905864,0.214811,0.249382],[-0.892465,-0.388533,-0.22339],[-0.887549,-0.418497,0.317846],[-0.850998,0.061184,-0.366646],[-0.843044,0.012701,0.509091],[-0.829645,-0.590642,0.03632],[-0.810408,0.497156,0.096369],[-0.754269,-0.235871,-0.487662],[-0.744438,-0.2958,0.594808],[-0.658813,0.046474,-0.640675],[-0.655662,-0.544372,-0.401946],[-0.647709,-0.592856,0.473792],[-0.645943,-0.031974,0.776297],[-0.593136,0.75189,0.108498],[-0.592842,-0.746482,-0.142236],[-0.589804,-0.765001,0.192266],[-0.405755,0.194817,-0.802538],[-0.400657,-0.761193,-0.416265],[-0.392703,-0.809676,0.459472],[-0.389847,0.09785,0.948936],[-0.340078,0.900233,-0.053365],[-0.33704,0.881715,0.281137],[-0.188483,0.449551,-0.790409],[-0.172576,0.352585,0.961066],[-0.147893,0.885523,-0.327394],[-0.139939,0.83704,0.548343],[-0.091754,0.152496,-0.911425],[-0.089989,0.713378,-0.60892],[-0.086657,-0.803514,-0.525152],[-0.07712,0.63493,0.808053],[-0.076826,-0.863443,0.557318],[-0.073969,0.044084,1.046782],[0.126005,0.562254,-0.815685],[0.163251,-0.064325,-0.925745],[0.166107,0.843202,-0.436281],[0.166401,-0.655171,-0.687015],[0.175938,0.783273,0.64619],[0.179271,-0.733618,0.729957],[0.181036,-0.172737,1.032463],[0.222734,0.265199,-0.936702],[0.229221,-0.857281,-0.427306],[0.237175,-0.905764,0.448431],[0.261857,-0.372826,-0.840028],[0.277765,-0.469792,0.911446],[0.382101,0.692078,-0.643046],[0.426322,-0.901955,-0.1601],[0.42936,-0.920474,0.174402],[0.479129,-0.118091,-0.827899],[0.481985,0.789435,-0.338434],[0.489939,0.740952,0.537303],[0.495036,-0.215058,0.923576],[0.538612,0.211432,-0.838855],[0.637106,0.475258,-0.657366],[0.679086,0.74476,-0.071228],[0.682124,0.726241,0.263273],[0.682418,-0.772131,0.012539],[0.735225,0.011733,-0.65526],[0.73699,0.572615,-0.352754],[0.744944,0.524132,0.522983],[0.748094,-0.066715,0.761713],[0.833719,0.275559,-0.473771],[0.84355,0.21563,0.6087],[0.899689,-0.517397,0.024669],[0.932326,-0.032942,-0.388054],[0.940279,-0.081425,0.487683],[0.995146,-0.235051,-0.128344],[0.998184,-0.253571,0.206158]],
"edge":[[40,44],[44,49],[49,58],[58,65],[65,69],[69,67],[67,62],[62,53],[53,46],[46,40],[41,46],[53,41],[11,14],[14,21],[21,33],[33,40],[41,34],[34,22],[22,15],[15,11],[26,22],[34,26],[33,44],[20,31],[31,43],[43,48],[48,49],[21,18],[18,17],[17,20],[14,18],[48,58],[50,59],[59,66],[66,68],[68,65],[43,38],[38,45],[45,50],[31,38],[68,69],[56,57],[57,61],[61,64],[64,67],[66,63],[63,60],[60,56],[59,63],[64,62],[32,26],[61,52],[52,39],[39,32],[57,52],[16,23],[23,27],[27,30],[30,25],[25,19],[19,12],[12,6],[6,2],[2,9],[9,16],[3,9],[2,3],[32,28],[28,24],[24,16],[3,7],[7,15],[7,11],[24,23],[56,51],[51,37],[37,27],[28,39],[37,30],[60,51],[29,19],[25,29],[20,13],[13,10],[10,12],[29,36],[36,45],[36,50],[10,6],[17,13],[0,4],[4,8],[8,5],[5,1],[1,0],[0,6],[10,4],[13,4],[17,8],[18,8],[14,5],[11,5],[7,1],[3,1],[2,0],[35,47],[47,55],[55,54],[54,42],[42,35],[35,30],[37,47],[51,47],[60,55],[63,55],[59,54],[50,54],[36,42],[29,42],[25,35]],
"face":[[41,46,53],[26,22,34],[33,44,40],[14,18,21],[48,58,49],[31,38,43],[68,69,65],[59,63,66],[64,62,67],[57,52,61],[3,9,2],[11,15,7],[24,23,16],[32,39,28],[37,30,27],[60,51,56],[29,19,25],[50,45,36],[10,6,12],[17,13,20],[4,10,13],[8,17,18],[5,14,11],[3,1,7],[0,2,6],[47,37,51],[55,60,63],[54,59,50],[29,42,36],[35,25,30],[4,0,6,10],[8,4,13,17],[5,8,18,14],[1,5,11,7],[0,1,3,2],[47,35,30,37],[55,47,51,60],[54,55,63,59],[42,54,50,36],[35,42,29,25],[0,4,8,5,1],[35,47,55,54,42],[40,44,49,58,65,69,67,62,53,46],[11,14,21,33,40,46,41,34,22,15],[20,31,43,48,49,44,33,21,18,17],[50,59,66,68,65,58,48,43,38,45],[56,57,61,64,67,69,68,66,63,60],[32,26,34,41,53,62,64,61,52,39],[16,23,27,30,25,19,12,6,2,9],[26,32,28,24,16,9,3,7,15,22],[57,56,51,37,27,23,24,28,39,52],[31,20,13,10,12,19,29,36,45,38]]},

"J71" : {
"name":"Triaugmented Truncated Dodecahedron (J71)",
"category":["Johnson Solid"],
"vertex":[[-0.942902,0.07027,-0.149675],[-0.907058,0.322313,0.065363],[-0.897048,-0.257164,-0.191336],[-0.851819,0.371393,-0.259585],[-0.803207,0.402693,0.37164],[-0.802539,0.632087,0.129919],[-0.787011,-0.534922,-0.043707],[-0.7473,0.681167,-0.195029],[-0.731772,-0.485841,-0.368655],[-0.671018,0.280706,0.65217],[-0.658589,0.531186,-0.479085],[-0.654821,-0.656908,0.236823],[-0.579935,0.581829,0.542259],[-0.579266,0.811224,0.300537],[-0.560981,0.002949,0.799799],[-0.550971,-0.576528,0.5431],[-0.515127,-0.324486,0.758138],[-0.510203,-0.528414,-0.613902],[-0.489887,0.890637,-0.225239],[-0.437021,0.488613,-0.724333],[-0.401177,0.740656,-0.509295],[-0.386037,0.971017,0.081037],[-0.385694,-0.805205,0.365781],[-0.322522,0.791299,0.512049],[-0.317618,-0.591958,0.780503],[-0.316974,-0.368621,-0.833402],[-0.291854,-0.145349,0.928756],[-0.271745,0.259936,-0.901652],[-0.225891,-0.067498,-0.943313],[-0.206937,-0.646378,-0.685774],[-0.177904,0.919793,-0.338677],[-0.152342,-0.820635,0.603184],[-0.129293,0.951092,0.292549],[-0.094345,-0.412822,0.951122],[-0.082428,-0.92317,0.29391],[-0.074054,1.000172,-0.032399],[0.002897,0.829106,0.573078],[0.031522,0.141972,-0.973523],[0.033565,-0.107542,0.989786],[0.06219,-0.794676,-0.556816],[0.13914,-0.965743,0.048662],[0.147515,0.9576,-0.277647],[0.173077,-0.782829,0.664213],[0.19438,-0.916662,-0.276286],[0.208921,-0.530786,0.87925],[0.242991,-0.885363,0.354939],[0.272024,0.680808,0.702036],[0.290978,0.101928,0.959576],[0.336832,-0.225507,0.917915],[0.356941,0.179778,-0.912493],[0.382061,0.403051,0.849665],[0.387609,-0.75687,-0.495786],[0.450781,0.839635,-0.349518],[0.466264,-0.706226,0.525558],[0.502108,-0.454184,0.740596],[0.57529,0.562844,0.630165],[0.580214,0.358915,-0.741875],[-0.018946,-0.326587,-0.976456],[0.616058,0.610958,-0.526838],[0.626068,0.031481,-0.783536],[0.645022,-0.5474,-0.525996],[0.238466,-0.117117,-1.006666],[0.719908,0.691337,-0.22056],[0.723676,-0.496756,0.495348],[0.736105,-0.246276,-0.635907],[0.796859,0.520271,0.384917],[0.091091,-0.604344,-0.828827],[0.852098,0.569351,0.059969],[0.868294,-0.368263,-0.355377],[0.507593,-0.265415,-0.877708],[0.916906,-0.336964,0.275848],[0.962135,0.291594,0.207599],[0.41651,-0.566538,-0.767798],[0.972145,-0.287883,-0.0491],[1.007989,-0.035841,0.165937]],
"edge":[[68,64],[64,59],[59,56],[56,58],[58,62],[62,67],[67,71],[71,74],[74,73],[73,68],[70,73],[74,70],[40,43],[43,51],[51,60],[60,68],[70,63],[63,53],[53,45],[45,40],[54,53],[63,54],[60,64],[71,65],[65,55],[55,50],[50,47],[47,48],[48,54],[43,39],[39,51],[49,56],[59,49],[20,30],[30,41],[41,52],[52,58],[49,37],[37,27],[27,19],[19,20],[28,27],[37,28],[52,62],[36,46],[46,55],[65,67],[41,35],[35,32],[32,36],[30,35],[46,50],[2,6],[6,11],[11,15],[15,16],[16,14],[14,9],[9,4],[4,1],[1,0],[0,2],[3,0],[1,3],[28,25],[25,17],[17,8],[8,2],[3,10],[10,19],[10,20],[8,6],[40,34],[34,22],[22,11],[17,29],[29,39],[25,29],[22,15],[45,34],[26,14],[16,26],[36,23],[23,12],[12,9],[26,38],[38,47],[38,48],[12,4],[32,23],[5,13],[13,21],[21,18],[18,7],[7,5],[5,4],[12,13],[23,13],[32,21],[35,21],[30,18],[20,18],[10,7],[3,7],[1,5],[24,31],[31,42],[42,44],[44,33],[33,24],[24,15],[22,31],[34,31],[45,42],[53,42],[54,44],[48,44],[38,33],[26,33],[16,24],[72,66],[66,57],[57,61],[61,69],[69,72],[72,51],[39,66],[29,66],[25,57],[28,57],[37,61],[49,61],[59,69],[64,69],[60,72]],
"face":[[70,73,74],[54,53,63],[60,64,68],[43,39,51],[49,56,59],[28,27,37],[52,62,58],[30,35,41],[65,71,67],[50,55,46],[3,0,1],[20,19,10],[8,6,2],[25,29,17],[22,15,11],[45,34,40],[26,14,16],[48,47,38],[12,4,9],[32,23,36],[13,12,23],[21,32,35],[18,30,20],[3,7,10],[5,1,4],[31,22,34],[42,45,53],[44,54,48],[26,33,38],[24,16,15],[66,39,29],[57,25,28],[61,37,49],[69,59,64],[72,60,51],[13,5,4,12],[21,13,23,32],[18,21,35,30],[7,18,20,10],[5,7,3,1],[31,24,15,22],[42,31,34,45],[44,42,53,54],[33,44,48,38],[24,33,26,16],[66,72,51,39],[66,29,25,57],[57,28,37,61],[61,49,59,69],[69,64,60,72],[5,13,21,18,7],[24,31,42,44,33],[72,66,57,61,69],[68,64,59,56,58,62,67,71,74,73],[40,43,51,60,68,73,70,63,53,45],[54,63,70,74,71,65,55,50,47,48],[20,30,41,52,58,56,49,37,27,19],[36,46,55,65,67,62,52,41,35,32],[2,6,11,15,16,14,9,4,1,0],[28,25,17,8,2,0,3,10,19,27],[43,40,34,22,11,6,8,17,29,39],[46,36,23,12,9,14,26,38,47,50]]},

"J72" : {
"name":"Gyrate Rhombicosidodecahedron (J72)",
"category":["Johnson Solid"],
"vertex":[[-0.976612,0.213547,-0.025026],[-0.942883,-0.134569,-0.304734],[-0.917763,0.061996,0.392261],[-0.863187,-0.501268,-0.060316],[-0.847662,-0.379783,0.37045],[-0.806942,0.483006,-0.339927],[-0.791417,0.60449,0.090839],[-0.773213,0.13489,-0.619635],[-0.732567,0.452939,0.508126],[-0.703113,-0.306889,-0.641445],[-0.652871,0.086241,0.752543],[-0.623417,-0.673588,-0.397028],[-0.582771,-0.355538,0.730732],[-0.564567,-0.825138,0.020258],[-0.549042,-0.703654,0.451025],[-0.47356,0.76745,-0.432161],[-0.458035,0.888934,-0.001394],[-0.418985,0.204186,-0.884738],[-0.362814,0.643719,0.673789],[-0.348885,-0.237593,-0.906548],[-0.283118,0.277021,0.918206],[-0.23379,0.595129,-0.768872],[-0.219935,-0.830923,-0.511073],[-0.193143,0.913179,0.358888],[-0.169693,-0.437793,0.882916],[-0.161085,-0.982474,-0.093786],[-0.135964,-0.785909,0.603208],[-0.103807,0.95823,-0.266497],[-0.050264,-0.561464,-0.825973],[-0.015503,0.04685,-0.998782],[0.015502,-0.04685,0.998781],[0.075132,0.737294,0.671381],[0.103807,-0.958229,0.266497],[0.135964,0.78591,-0.603209],[0.154828,0.370596,0.915798],[0.161084,0.982475,0.093785],[0.169693,0.437794,-0.882917],[0.193143,-0.913178,-0.358889],[0.233789,-0.595129,0.768871],[0.283118,-0.277021,-0.918207],[0.362813,-0.643719,-0.67379],[0.418985,-0.204186,0.884737],[0.42936,0.80659,0.406278],[0.458035,-0.888933,0.001394],[0.47356,-0.767449,0.43216],[0.549042,0.703655,-0.451025],[0.558311,0.21326,0.801754],[0.564567,0.825139,-0.020259],[0.582771,0.355539,-0.730733],[0.652871,-0.08624,-0.752544],[0.727981,0.48272,0.486853],[0.732567,-0.452939,-0.508127],[0.773213,-0.13489,0.619634],[0.791417,-0.60449,-0.09084],[0.806942,-0.483006,0.339926],[0.847662,0.379784,-0.370451],[0.863187,0.501268,0.060316],[0.917763,-0.061995,-0.392261],[0.942883,0.13457,0.304733],[0.976612,-0.213546,0.025025]],
"edge":[[36,33],[33,45],[45,48],[48,36],[45,55],[55,48],[45,47],[47,56],[56,55],[33,27],[27,35],[35,47],[35,42],[42,47],[42,50],[50,56],[23,31],[31,42],[35,23],[23,18],[18,31],[18,20],[20,34],[34,31],[34,46],[46,50],[20,30],[30,34],[30,41],[41,46],[55,57],[57,49],[49,48],[57,51],[51,49],[57,59],[59,53],[53,51],[56,58],[58,59],[59,54],[54,53],[54,44],[44,43],[43,53],[58,52],[52,54],[50,58],[46,52],[52,41],[41,38],[38,44],[30,24],[24,38],[51,40],[40,39],[39,49],[40,28],[28,39],[40,37],[37,22],[22,28],[43,37],[37,25],[25,22],[25,13],[13,11],[11,22],[43,32],[32,25],[44,32],[38,26],[26,32],[26,14],[14,13],[24,26],[24,12],[12,14],[28,19],[19,29],[29,39],[19,17],[17,29],[19,9],[9,7],[7,17],[11,9],[9,1],[1,7],[1,0],[0,5],[5,7],[11,3],[3,1],[13,3],[14,4],[4,3],[4,2],[2,0],[12,4],[12,10],[10,2],[17,21],[21,36],[36,29],[21,33],[21,15],[15,27],[5,15],[15,16],[16,27],[16,23],[5,6],[6,16],[0,6],[2,8],[8,6],[8,18],[10,8],[10,20]],
"face":[[48,45,55],[35,42,47],[23,18,31],[20,30,34],[49,57,51],[59,54,53],[56,50,58],[46,41,52],[39,40,28],[37,25,22],[43,44,32],[38,24,26],[29,19,17],[9,1,7],[11,13,3],[14,12,4],[36,21,33],[15,16,27],[5,0,6],[2,10,8],[36,33,45,48],[45,47,56,55],[47,42,50,56],[23,31,42,35],[18,20,34,31],[34,30,41,46],[48,55,57,49],[57,59,53,51],[53,54,44,43],[58,52,54,59],[50,46,52,58],[41,30,24,38],[49,51,40,39],[40,37,22,28],[22,25,13,11],[43,32,25,37],[44,38,26,32],[26,24,12,14],[39,28,19,29],[19,9,7,17],[7,1,0,5],[11,3,1,9],[13,14,4,3],[4,12,10,2],[29,17,21,36],[21,15,27,33],[27,16,23,35],[5,6,16,15],[0,2,8,6],[8,10,20,18],[33,27,35,47,45],[31,34,46,50,42],[55,56,58,59,57],[52,41,38,44,54],[51,53,43,37,40],[32,26,14,13,25],[28,22,11,9,19],[3,4,2,0,1],[17,7,5,15,21],[6,8,18,23,16],[36,48,49,39,29],[10,12,24,30,20]]},

"J73" : {
"name":"Parabigyrate Rhombicosidodecahedron (J73)",
"category":["Johnson Solid"],
"vertex":[[-0.984691,0.125192,0.121281],[-0.957572,-0.075612,-0.278094],[-0.942455,-0.319982,0.096891],[-0.856557,0.512005,-0.064506],[-0.832097,0.116607,0.542233],[-0.829438,0.3112,-0.463882],[-0.789861,-0.328568,0.517842],[-0.761099,-0.409107,-0.503346],[-0.745982,-0.653477,-0.128361],[-0.624772,0.742482,0.241623],[-0.609655,0.498112,0.616608],[-0.606996,0.692705,-0.389506],[-0.558076,-0.098091,0.823971],[-0.553774,0.216768,-0.803956],[-0.511538,-0.228406,-0.828346],[-0.49908,-0.667369,0.552753],[-0.471962,-0.868174,0.153378],[-0.40552,-0.630422,-0.661906],[-0.390403,-0.874792,-0.286921],[-0.375211,0.923183,-0.083378],[-0.335634,0.283415,0.898346],[-0.331332,0.598273,-0.729581],[-0.287416,0.79711,0.531045],[-0.267295,-0.436892,0.858882],[-0.134858,0.264778,-0.954832],[-0.092623,-0.180396,-0.979223],[-0.070822,-0.770387,0.63363],[-0.043703,-0.971192,0.234255],[-0.037854,0.977811,0.206045],[-0.013394,0.582413,0.812784],[0.013396,-0.582411,-0.812783],[0.037856,-0.977809,-0.206044],[0.043705,0.971193,-0.234254],[0.070824,0.770388,-0.63363],[0.092624,0.180397,0.979223],[0.13486,-0.264777,0.954833],[0.267297,0.436893,-0.858881],[0.287417,-0.797109,-0.531044],[0.331333,-0.598272,0.729581],[0.335635,-0.283414,-0.898346],[0.375212,-0.923181,0.083378],[0.390404,0.874793,0.286922],[0.405521,0.630423,0.661907],[0.471963,0.868175,-0.153377],[0.499082,0.66737,-0.552753],[0.511539,0.228408,0.828347],[0.553775,-0.216766,0.803957],[0.558078,0.098092,-0.823971],[0.606997,-0.692704,0.389507],[0.609656,-0.498111,-0.616607],[0.624773,-0.74248,-0.241622],[0.745984,0.653478,0.128361],[0.761101,0.409108,0.503346],[0.789863,0.328569,-0.517842],[0.82944,-0.311199,0.463882],[0.832099,-0.116605,-0.542232],[0.856558,-0.512003,0.064507],[0.942457,0.319983,-0.09689],[0.957574,0.075614,0.278095],[0.984692,-0.125191,-0.121281]],
"edge":[[24,21],[21,33],[33,36],[36,24],[33,44],[44,36],[33,32],[32,43],[43,44],[21,11],[11,19],[19,32],[19,28],[28,32],[28,41],[41,43],[9,22],[22,28],[19,9],[9,10],[10,22],[10,20],[20,29],[29,22],[29,42],[42,41],[20,34],[34,29],[34,45],[45,42],[44,53],[53,47],[47,36],[53,55],[55,47],[53,57],[57,59],[59,55],[43,51],[51,57],[57,58],[58,59],[58,54],[54,56],[56,59],[51,52],[52,58],[41,51],[42,52],[52,45],[45,46],[46,54],[34,35],[35,46],[55,49],[49,39],[39,47],[49,50],[50,37],[37,49],[50,40],[40,31],[31,37],[56,50],[40,27],[27,31],[27,16],[16,18],[18,31],[56,48],[48,40],[54,48],[46,38],[38,48],[38,26],[26,27],[35,38],[35,23],[23,26],[37,30],[30,39],[30,25],[25,39],[30,17],[17,14],[14,25],[18,17],[17,7],[7,14],[7,8],[8,2],[2,1],[1,7],[18,8],[16,8],[26,15],[15,16],[15,6],[6,2],[23,15],[23,12],[12,6],[14,13],[13,24],[24,25],[13,21],[13,5],[5,11],[1,5],[5,3],[3,11],[3,9],[1,0],[0,3],[2,0],[6,4],[4,0],[4,10],[12,4],[12,20]],
"face":[[36,33,44],[19,28,32],[9,10,22],[20,34,29],[47,53,55],[57,58,59],[43,41,51],[42,45,52],[49,50,37],[40,27,31],[56,54,48],[46,35,38],[39,30,25],[17,7,14],[18,16,8],[26,23,15],[24,13,21],[5,3,11],[1,2,0],[6,12,4],[24,21,33,36],[33,32,43,44],[32,28,41,43],[9,22,28,19],[10,20,29,22],[29,34,45,42],[36,44,53,47],[53,57,59,55],[59,58,54,56],[51,52,58,57],[41,42,52,51],[45,34,35,46],[47,55,49,39],[50,40,31,37],[31,27,16,18],[56,48,40,50],[54,46,38,48],[38,35,23,26],[49,37,30,39],[30,17,14,25],[7,8,2,1],[18,8,7,17],[27,26,15,16],[15,23,12,6],[25,14,13,24],[13,5,11,21],[11,3,9,19],[1,0,3,5],[2,6,4,0],[4,12,20,10],[21,11,19,32,33],[22,29,42,41,28],[44,43,51,57,53],[52,45,46,54,58],[55,59,56,50,49],[48,38,26,27,40],[37,31,18,17,30],[16,15,6,2,8],[14,7,1,5,13],[0,4,10,9,3],[24,36,47,39,25],[12,23,35,34,20]]},

"J74" : {
"name":"Metabigyrate Rhombicosidodecahedron (J74)",
"category":["Johnson Solid"],
"vertex":[[-0.966046,-0.051368,0.253213],[-0.95229,0.30466,-0.018105],[-0.940892,-0.323,-0.101952],[-0.927135,0.033028,-0.37327],[-0.826492,-0.473879,0.30389],[-0.790478,0.458215,-0.40643],[-0.767188,0.060532,0.63856],[-0.744929,0.636598,0.199559],[-0.701332,-0.650609,-0.291274],[-0.679074,-0.074543,-0.730275],[-0.63053,0.485719,0.6054],[-0.627634,-0.361979,0.689237],[-0.586933,-0.801488,0.114568],[-0.583117,0.790154,-0.188766],[-0.542416,0.350644,-0.763435],[-0.53952,-0.497054,-0.679599],[-0.420274,-0.03004,0.9069],[-0.397364,0.817911,0.416083],[-0.338872,-0.909059,-0.242438],[-0.302857,0.023036,-0.952757],[-0.283617,0.395147,0.87374],[-0.265174,-0.620429,0.738072],[-0.240019,-0.892061,0.382907],[-0.235552,0.971466,0.027758],[-0.206901,0.887732,-0.411248],[-0.181746,0.6161,-0.766413],[-0.17706,-0.755504,-0.630763],[-0.163303,-0.399475,-0.902081],[-0.057814,-0.288491,0.955736],[-0.05045,0.727338,0.684423],[0.008042,-0.999632,0.025902],[0.057813,0.288491,-0.955736],[0.163303,0.399477,0.902082],[0.181745,-0.616099,0.766414],[0.2069,-0.887731,0.411249],[0.211368,0.975796,0.0561],[0.240019,0.892062,-0.382907],[0.265173,0.62043,-0.738072],[0.26986,-0.751174,-0.602422],[0.283616,-0.395146,-0.873739],[0.302857,-0.023034,0.952758],[0.325767,0.824917,0.461941],[0.384259,-0.902053,-0.19658],[0.420273,0.030041,-0.9069],[0.539519,0.497055,0.6796],[0.542416,-0.350643,0.763436],[0.583117,-0.790152,0.188767],[0.586933,0.801489,-0.114567],[0.627634,0.36198,-0.689236],[0.658347,-0.625824,-0.418238],[0.672103,-0.269795,-0.689555],[0.679073,0.074544,0.730276],[0.701332,0.65061,0.291275],[0.790477,-0.458214,0.40643],[0.826492,0.473881,-0.303889],[0.857205,-0.513923,-0.03289],[0.879463,0.062143,-0.471892],[0.927134,-0.033027,0.37327],[0.940891,0.323002,0.101953],[0.993863,-0.088736,-0.06605]],
"edge":[[19,14],[14,25],[25,31],[31,19],[25,37],[37,31],[25,24],[24,36],[36,37],[14,5],[5,13],[13,24],[13,23],[23,24],[23,35],[35,36],[7,17],[17,23],[13,7],[7,10],[10,17],[10,20],[20,29],[29,17],[29,41],[41,35],[20,32],[32,29],[32,44],[44,41],[37,48],[48,43],[43,31],[48,54],[54,56],[56,48],[54,58],[58,59],[59,56],[36,47],[47,54],[58,57],[57,59],[57,53],[53,55],[55,59],[47,52],[52,58],[35,47],[41,52],[52,44],[44,51],[51,57],[32,40],[40,51],[56,50],[50,43],[50,39],[39,43],[50,49],[49,38],[38,39],[55,49],[49,42],[42,38],[42,46],[46,34],[34,30],[30,42],[55,46],[53,46],[51,45],[45,53],[45,33],[33,34],[40,45],[40,28],[28,33],[38,26],[26,27],[27,39],[26,15],[15,27],[26,18],[18,8],[8,15],[30,18],[18,12],[12,8],[12,4],[4,2],[2,8],[30,22],[22,12],[34,22],[33,21],[21,22],[21,11],[11,4],[28,21],[28,16],[16,11],[15,9],[9,19],[19,27],[9,14],[9,3],[3,5],[2,3],[3,1],[1,5],[1,7],[2,0],[0,1],[4,0],[11,6],[6,0],[6,10],[16,6],[16,20]],
"face":[[31,25,37],[13,23,24],[7,10,17],[20,32,29],[48,54,56],[58,57,59],[36,35,47],[41,44,52],[43,50,39],[49,42,38],[55,53,46],[51,40,45],[27,26,15],[18,12,8],[30,34,22],[33,28,21],[19,9,14],[3,1,5],[2,4,0],[11,16,6],[19,14,25,31],[25,24,36,37],[24,23,35,36],[7,17,23,13],[10,20,29,17],[29,32,44,41],[31,37,48,43],[54,58,59,56],[59,57,53,55],[47,52,58,54],[35,41,52,47],[44,32,40,51],[48,56,50,43],[50,49,38,39],[42,46,34,30],[55,46,42,49],[57,51,45,53],[45,40,28,33],[39,38,26,27],[26,18,8,15],[8,12,4,2],[30,22,12,18],[34,33,21,22],[21,28,16,11],[27,15,9,19],[9,3,5,14],[5,1,7,13],[2,0,1,3],[4,11,6,0],[6,16,20,10],[14,5,13,24,25],[17,29,41,35,23],[37,36,47,54,48],[52,44,51,57,58],[56,59,55,49,50],[53,45,33,34,46],[38,42,30,18,26],[22,21,11,4,12],[15,8,2,3,9],[0,6,10,7,1],[19,31,43,39,27],[16,28,40,32,20]]},

"J75" : {
"name":"Trigyrate Rhombicosidodecahedron (J75)",
"category":["Johnson Solid"],
"vertex":[[-0.980376,-0.197048,-0.005857],[-0.946332,0.150802,-0.285858],[-0.935804,0.079716,0.34339],[-0.901759,0.427566,0.063389],[-0.812124,-0.53251,0.23851],[-0.8048,-0.555655,-0.20867],[-0.767552,-0.255746,0.587757],[-0.759203,0.553784,-0.341957],[-0.749715,0.007177,-0.661721],[-0.688108,0.168923,0.705672],[-0.662244,-0.429437,-0.614016],[-0.633023,0.731755,0.252621],[-0.562586,0.41016,-0.71782],[-0.500979,0.571905,0.649573],[-0.490467,0.857973,-0.152725],[-0.483464,-0.835984,0.259599],[-0.47614,-0.859129,-0.18758],[-0.411344,-0.388171,0.824694],[-0.387011,0.051553,-0.920632],[-0.333584,-0.732911,-0.592926],[-0.331901,0.036498,0.942608],[-0.299539,-0.385062,-0.872928],[-0.245677,0.868112,0.431306],[-0.235768,-0.746778,0.621881],[-0.172335,0.625585,-0.760884],[-0.144772,0.43948,0.88651],[-0.127762,0.902348,-0.411637],[-0.119933,-0.991554,0.049356],[-0.103121,0.994331,0.02596],[-0.003241,-0.266976,0.963698],[0.003241,0.266978,-0.963697],[0.11053,0.735688,0.668243],[0.110728,-0.787329,-0.606508],[0.127763,-0.902347,0.411638],[0.144773,-0.439479,-0.886509],[0.172335,-0.625583,0.760885],[0.242772,-0.947178,-0.209555],[0.271977,0.571167,-0.774465],[0.29954,0.385063,0.872928],[0.31655,0.847931,-0.425218],[0.331901,-0.036497,-0.942608],[0.341191,0.939913,0.012379],[0.387011,-0.051552,0.920633],[0.473235,0.780063,0.409331],[0.490467,-0.857972,0.152726],[0.528066,-0.712229,-0.462467],[0.562111,-0.364379,-0.742468],[0.562587,-0.410159,0.717821],[0.600637,0.267692,-0.753376],[0.662244,0.429438,0.614017],[0.672757,0.715506,-0.188282],[0.749716,-0.007176,0.661722],[0.759203,-0.553783,0.341958],[0.775762,-0.623022,-0.100185],[0.804801,0.555656,0.208671],[0.830847,-0.06019,-0.553237],[0.848333,0.356899,-0.391094],[0.946332,-0.1508,0.285859],[0.96289,-0.22004,-0.156284],[0.980377,0.197049,0.005858]],
"edge":[[18,12],[12,24],[24,30],[30,18],[24,37],[37,30],[24,26],[26,39],[39,37],[12,7],[7,14],[14,26],[14,28],[28,26],[28,41],[41,39],[11,22],[22,28],[14,11],[11,13],[13,22],[13,25],[25,31],[31,22],[31,43],[43,41],[25,38],[38,31],[38,49],[49,43],[37,48],[48,40],[40,30],[48,56],[56,55],[55,48],[56,59],[59,58],[58,55],[39,50],[50,56],[59,57],[57,58],[57,52],[52,53],[53,58],[50,54],[54,59],[41,50],[43,54],[54,49],[49,51],[51,57],[38,42],[42,51],[55,46],[46,40],[46,34],[34,40],[46,45],[45,32],[32,34],[53,45],[45,36],[36,32],[36,44],[44,33],[33,27],[27,36],[53,44],[52,44],[51,47],[47,52],[47,35],[35,33],[42,47],[42,29],[29,35],[32,19],[19,21],[21,34],[19,10],[10,21],[19,16],[16,5],[5,10],[27,16],[27,15],[15,16],[15,4],[4,5],[33,23],[23,15],[35,23],[29,17],[17,23],[17,6],[6,4],[29,20],[20,17],[20,9],[9,6],[10,8],[8,18],[18,21],[8,12],[8,1],[1,7],[5,0],[0,1],[1,3],[3,7],[3,11],[0,2],[2,3],[4,0],[6,2],[2,9],[9,13],[20,25]],
"face":[[30,24,37],[14,28,26],[11,13,22],[25,38,31],[48,56,55],[59,57,58],[39,41,50],[43,49,54],[40,46,34],[45,36,32],[53,52,44],[51,42,47],[21,19,10],[27,15,16],[33,35,23],[29,20,17],[18,8,12],[1,3,7],[5,4,0],[6,9,2],[18,12,24,30],[24,26,39,37],[26,28,41,39],[11,22,28,14],[13,25,31,22],[31,38,49,43],[30,37,48,40],[56,59,58,55],[58,57,52,53],[50,54,59,56],[41,43,54,50],[49,38,42,51],[48,55,46,40],[46,45,32,34],[36,44,33,27],[53,44,36,45],[57,51,47,52],[47,42,29,35],[34,32,19,21],[19,16,5,10],[16,15,4,5],[33,23,15,27],[35,29,17,23],[17,20,9,6],[21,10,8,18],[8,1,7,12],[7,3,11,14],[0,2,3,1],[4,6,2,0],[9,20,25,13],[12,7,14,26,24],[22,31,43,41,28],[37,39,50,56,48],[54,49,51,57,59],[55,58,53,45,46],[52,47,35,33,44],[32,36,27,16,19],[23,17,6,4,15],[10,5,0,1,8],[2,9,13,11,3],[18,30,40,34,21],[20,29,42,38,25]]},

"J76" : {
"name":"Diminished Rhombicosidodecahedron (J76)",
"category":["Johnson Solid"],
"vertex":[[-0.975594,-0.152802,-0.163647],[-0.930864,0.290583,-0.105382],[-0.885816,-0.354103,0.228021],[-0.840234,-0.110417,-0.590106],[-0.813441,0.363309,0.322296],[-0.812393,-0.508854,-0.384052],[-0.795504,0.332968,-0.531841],[-0.7856,-0.035128,0.52835],[-0.722614,-0.710155,0.007616],[-0.695288,0.651943,-0.231511],[-0.605191,-0.637428,0.435294],[-0.577865,0.724669,0.196167],[-0.531438,-0.243136,-0.888462],[-0.504975,-0.318454,0.735624],[-0.503596,-0.641573,-0.682408],[-0.488086,0.523369,0.587835],[-0.460245,0.124931,0.79389],[-0.459063,0.474276,-0.794187],[-0.358847,0.793251,-0.493857],[-0.358332,-0.967284,-0.048676],[-0.295861,0.118224,-1.014591],[-0.240909,-0.894558,0.379002],[-0.222972,-0.924899,-0.475135],[-0.168853,0.910925,0.19814],[-0.079074,0.709624,0.589809],[-0.078756,-0.378446,0.864946],[-0.050051,0.660532,-0.792214],[-0.034026,0.064939,0.923211],[-0.033492,0.95331,-0.228318],[0.067887,-1.027277,0.080646],[0.084446,-0.734498,0.644541],[0.113151,0.30448,-1.012618],[0.201551,0.426299,0.797082],[0.203247,-0.984891,-0.345813],[0.257366,0.850932,0.327462],[0.275304,0.820591,-0.526675],[0.330256,-0.192191,0.866919],[0.392727,0.893318,-0.098997],[0.393242,-0.867217,0.346185],[0.493458,-0.548243,0.646514],[0.537991,0.567607,0.534736],[0.53937,0.244487,-0.883296],[0.565833,0.169169,0.74079],[0.61226,-0.798636,-0.34384],[0.639586,0.563462,-0.582967],[0.729683,-0.725909,0.083838],[0.757009,0.636188,-0.155289],[0.819995,-0.038838,-0.676023],[0.829899,-0.406935,0.384168],[0.846787,0.434888,0.236379],[0.847836,-0.437276,-0.469969],[0.874629,0.03645,0.442434],[0.920211,0.280136,-0.375693],[0.965259,-0.364549,-0.042291],[1.009989,0.078836,0.015975]],
"edge":[[31,20],[20,17],[17,26],[26,31],[17,18],[18,26],[17,6],[6,9],[9,18],[20,12],[12,3],[3,6],[6,1],[1,9],[1,4],[4,11],[11,9],[3,0],[0,1],[3,5],[5,0],[5,8],[8,2],[2,0],[2,7],[7,4],[8,10],[10,2],[10,13],[13,7],[18,28],[28,35],[35,26],[28,37],[37,35],[28,23],[23,34],[34,37],[11,23],[23,24],[24,34],[24,32],[32,40],[40,34],[11,15],[15,24],[4,15],[7,16],[16,15],[16,27],[27,32],[13,16],[13,25],[25,27],[37,46],[46,44],[44,35],[46,52],[52,44],[46,49],[49,54],[54,52],[40,49],[49,51],[51,54],[51,48],[48,53],[53,54],[40,42],[42,51],[32,42],[27,36],[36,42],[36,39],[39,48],[25,36],[25,30],[30,39],[52,47],[47,41],[41,44],[47,50],[50,43],[43,33],[33,22],[22,14],[14,12],[31,41],[53,50],[53,45],[45,43],[48,45],[39,38],[38,45],[38,29],[29,33],[30,38],[30,21],[21,29],[14,5],[29,19],[19,22],[19,8],[21,19],[21,10]],
"face":[[26,17,18],[6,1,9],[3,5,0],[8,10,2],[35,28,37],[23,24,34],[11,4,15],[7,13,16],[44,46,52],[49,51,54],[40,32,42],[27,25,36],[53,48,45],[39,30,38],[29,21,19],[31,20,17,26],[17,6,9,18],[9,1,4,11],[3,0,1,6],[5,8,2,0],[2,10,13,7],[26,18,28,35],[28,23,34,37],[34,24,32,40],[11,15,24,23],[4,7,16,15],[16,13,25,27],[35,37,46,44],[46,49,54,52],[54,51,48,53],[40,42,51,49],[32,27,36,42],[36,25,30,39],[44,52,47,41],[53,45,43,50],[48,39,38,45],[38,30,21,29],[12,14,5,3],[33,29,19,22],[19,21,10,8],[20,12,3,6,17],[0,2,7,4,1],[18,9,11,23,28],[15,16,27,32,24],[37,34,40,49,46],[42,36,39,48,51],[52,54,53,50,47],[45,38,29,33,43],[22,19,8,5,14],[31,26,35,44,41],[21,30,25,13,10],[41,47,50,43,33,22,14,12,20,31]]},

"J77" : {
"name":"Paragyrate Diminished Rhombicosidodecahedron (J77)",
"category":["Johnson Solid"],
"vertex":[[-0.965273,-0.178368,-0.195819],[-0.921193,0.268836,-0.202934],[-0.899923,-0.317663,0.226452],[-0.828599,0.405929,0.214939],[-0.815454,0.043453,0.480314],[-0.804857,-0.20085,-0.615041],[-0.791711,-0.563327,-0.349666],[-0.760776,0.246354,-0.622156],[-0.726361,-0.702622,0.072605],[-0.676307,0.60747,-0.368293],[-0.633767,-0.565529,0.490477],[-0.583713,0.744563,0.049579],[-0.582414,0.411487,0.590902],[-0.549298,-0.204413,0.74434],[-0.479947,-0.376522,-0.871086],[-0.466801,-0.738998,-0.605711],[-0.408623,0.347071,-0.882598],[-0.361062,-0.964382,0.077537],[-0.337528,0.750121,0.425542],[-0.324153,0.708187,-0.628736],[-0.316259,0.163621,0.854928],[-0.268468,-0.827289,0.49541],[-0.235061,-0.037888,-1.036445],[-0.200645,-0.986864,-0.341685],[-0.174334,0.930008,0.047397],[-0.131794,-0.242991,0.906168],[-0.013917,0.907526,-0.371825],[0.000756,0.532515,-0.88478],[0.041768,-0.62795,0.752321],[0.056442,-1.00296,0.239365],[0.079975,0.711542,0.58737],[0.093121,0.349066,0.852745],[0.174319,0.147557,-1.038628],[0.216858,-1.025442,-0.179857],[0.24317,0.89143,0.209225],[0.277585,-0.057546,0.903985],[0.310993,0.731855,-0.62787],[0.366678,-0.803621,0.496276],[0.403586,0.868948,-0.209997],[0.451147,-0.442505,0.750138],[0.509326,0.643564,0.473251],[0.522471,0.281088,0.738626],[0.591822,0.108979,-0.8768],[0.626237,-0.839998,-0.182039],[0.676292,0.470095,-0.622937],[0.718831,-0.702904,0.235834],[0.768885,0.607188,-0.205064],[0.8033,-0.341788,0.489696],[0.834235,0.467893,0.217206],[0.847381,0.105416,0.482581],[0.857978,-0.138887,-0.612774],[0.871123,-0.501364,-0.347399],[0.942447,0.222229,-0.358911],[0.963717,-0.36427,0.070474],[1.007798,0.082934,0.063359]],
"edge":[[32,22],[22,16],[16,27],[27,32],[16,19],[19,27],[16,7],[7,9],[9,19],[22,14],[14,5],[5,7],[7,1],[1,9],[1,3],[3,11],[11,9],[5,0],[0,1],[5,6],[6,0],[6,8],[8,2],[2,0],[2,4],[4,3],[8,10],[10,2],[10,13],[13,4],[19,26],[26,36],[36,27],[26,38],[38,36],[26,24],[24,34],[34,38],[11,24],[11,18],[18,24],[18,30],[30,34],[3,12],[12,18],[4,12],[13,20],[20,12],[20,31],[31,30],[13,25],[25,20],[25,35],[35,31],[38,46],[46,44],[44,36],[46,52],[52,44],[46,48],[48,54],[54,52],[34,40],[40,48],[48,49],[49,54],[49,47],[47,53],[53,54],[40,41],[41,49],[30,40],[31,41],[41,35],[35,39],[39,47],[25,28],[28,39],[52,50],[50,42],[42,44],[50,51],[51,43],[43,33],[33,23],[23,15],[15,14],[32,42],[53,51],[53,45],[45,43],[47,45],[39,37],[37,45],[37,29],[29,33],[28,37],[28,21],[21,29],[15,6],[29,17],[17,23],[17,8],[21,17],[21,10]],
"face":[[27,16,19],[7,1,9],[5,6,0],[8,10,2],[36,26,38],[11,18,24],[3,4,12],[13,25,20],[44,46,52],[48,49,54],[34,30,40],[31,35,41],[53,47,45],[39,28,37],[29,21,17],[32,22,16,27],[16,7,9,19],[9,1,3,11],[5,0,1,7],[6,8,2,0],[2,10,13,4],[27,19,26,36],[26,24,34,38],[24,18,30,34],[3,12,18,11],[4,13,20,12],[20,25,35,31],[36,38,46,44],[46,48,54,52],[54,49,47,53],[40,41,49,48],[30,31,41,40],[35,25,28,39],[44,52,50,42],[53,45,43,51],[47,39,37,45],[37,28,21,29],[14,15,6,5],[33,29,17,23],[17,21,10,8],[22,14,5,7,16],[0,2,4,3,1],[19,9,11,24,26],[12,20,31,30,18],[38,34,40,48,46],[41,35,39,47,49],[52,54,53,51,50],[45,37,29,33,43],[23,17,8,6,15],[32,27,36,44,42],[21,28,25,13,10],[42,50,51,43,33,23,15,14,22,32]]},

"J78" : {
"name":"Metagyrate Diminished Rhombicosidodecahedron (J78)",
"category":["Johnson Solid"],
"vertex":[[-0.969175,0.215371,-0.127391],[-0.952173,-0.166819,-0.363246],[-0.946899,-0.019645,0.255045],[-0.929897,-0.401835,0.01919],[-0.840084,0.222491,-0.557822],[-0.781766,-0.392789,0.443408],[-0.765536,0.610272,-0.059785],[-0.729493,0.230008,0.559009],[-0.721025,-0.390315,-0.677262],[-0.684982,-0.770578,-0.058468],[-0.636445,0.617392,-0.490216],[-0.617404,0.619318,0.364433],[-0.608936,-0.001005,-0.871838],[-0.56436,-0.143136,0.747372],[-0.555892,-0.763458,-0.488899],[-0.536851,-0.761533,0.36575],[-0.419039,0.867044,-0.186253],[-0.360721,0.251764,0.814977],[-0.305703,-0.985028,0.051734],[-0.279442,0.637958,-0.76245],[-0.270908,0.87609,0.237966],[-0.26244,0.255768,-0.998305],[-0.248632,0.641074,0.620402],[-0.185081,-0.357586,0.857574],[-0.176613,-0.977908,-0.378698],[-0.168079,-0.739776,0.621718],[-0.062036,0.887611,-0.458486],[0.018558,0.037315,0.925179],[0.063069,-0.963271,0.307702],[0.169112,0.664116,-0.772503],[0.177646,0.902248,0.227913],[0.186114,0.281925,-1.008358],[0.199922,0.667232,0.610349],[0.211888,-0.546211,0.763647],[0.271941,-0.951751,-0.38875],[0.306736,0.909368,-0.202518],[0.365054,0.294088,0.798712],[0.415527,-0.151311,0.831252],[0.420072,-0.942705,0.035468],[0.443036,-0.769707,0.44963],[0.537884,0.685872,-0.516534],[0.556925,0.687798,0.338115],[0.565393,0.067476,-0.898156],[0.618437,-0.694978,-0.515217],[0.686015,0.694918,-0.092316],[0.722058,0.314654,0.526478],[0.730526,-0.305668,-0.709793],[0.766569,-0.685932,-0.090999],[0.77253,-0.130744,0.559019],[0.782799,0.317129,-0.594192],[0.789532,-0.512934,0.323163],[0.93093,0.326175,-0.169974],[0.947932,-0.056015,-0.405829],[0.953206,0.091159,0.212462],[0.970208,-0.291031,-0.023393]],
"edge":[[31,21],[21,19],[19,29],[29,31],[19,26],[26,29],[19,10],[10,16],[16,26],[21,12],[12,4],[4,10],[10,6],[6,16],[6,11],[11,20],[20,16],[4,0],[0,6],[4,1],[1,0],[1,3],[3,2],[2,0],[2,7],[7,11],[3,5],[5,2],[5,13],[13,7],[26,35],[35,40],[40,29],[35,44],[44,40],[35,30],[30,41],[41,44],[20,30],[30,32],[32,41],[32,36],[36,45],[45,41],[20,22],[22,32],[11,22],[7,17],[17,22],[17,27],[27,36],[13,17],[13,23],[23,27],[44,51],[51,49],[49,40],[51,52],[52,49],[51,53],[53,54],[54,52],[45,53],[45,48],[48,53],[48,50],[50,54],[36,37],[37,48],[27,37],[23,33],[33,37],[33,39],[39,50],[23,25],[25,33],[25,28],[28,39],[52,46],[46,42],[42,49],[46,43],[43,34],[34,24],[24,14],[14,8],[8,12],[31,42],[54,47],[47,43],[47,38],[38,34],[50,47],[39,38],[38,28],[28,18],[18,24],[25,15],[15,18],[8,1],[18,9],[9,14],[9,3],[15,9],[15,5]],
"face":[[29,19,26],[10,6,16],[4,1,0],[3,5,2],[40,35,44],[30,32,41],[20,11,22],[7,13,17],[49,51,52],[45,48,53],[36,27,37],[23,25,33],[54,50,47],[39,28,38],[18,15,9],[31,21,19,29],[19,10,16,26],[16,6,11,20],[4,0,6,10],[1,3,2,0],[2,5,13,7],[29,26,35,40],[35,30,41,44],[41,32,36,45],[20,22,32,30],[11,7,17,22],[17,13,23,27],[40,44,51,49],[51,53,54,52],[53,48,50,54],[36,37,48,45],[27,23,33,37],[33,25,28,39],[49,52,46,42],[47,38,34,43],[50,39,38,47],[28,25,15,18],[12,8,1,4],[24,18,9,14],[9,15,5,3],[21,12,4,10,19],[0,2,7,11,6],[26,16,20,30,35],[22,17,27,36,32],[44,41,45,53,51],[37,33,39,50,48],[52,54,47,43,46],[38,28,18,24,34],[14,9,3,1,8],[31,29,40,49,42],[15,25,23,13,5],[42,46,43,34,24,14,8,12,21,31]]},

"J79" : {
"name":"Bigyrate Diminished Rhombicosidodecahedron (J79)",
"category":["Johnson Solid"],
"vertex":[[-1.035663,0.17951,0.161516],[-1.027893,0.048482,-0.268318],[-0.891113,0.078842,0.574986],[-0.870771,-0.264193,-0.550334],[-0.833419,0.579967,0.188311],[-0.820848,0.367959,-0.507174],[-0.700657,0.696435,-0.224962],[-0.68887,0.479299,0.601781],[-0.663727,0.055284,-0.78919],[-0.649458,-0.215069,0.814161],[-0.624314,-0.639084,-0.576811],[-0.485083,0.858791,0.134418],[-0.461483,0.455741,-0.762395],[-0.403,-0.58996,0.787683],[-0.382659,-0.932996,-0.337637],[-0.341293,0.784217,-0.480183],[-0.340534,0.758124,0.547888],[-0.322222,0.432884,0.857516],[-0.297863,0.00374,0.988774],[-0.289308,-0.122159,-0.96329],[-0.26495,-0.551303,-0.832032],[-0.245879,-0.902636,0.505667],[-0.238109,-1.033664,0.075833],[-0.125719,0.946573,-0.120803],[-0.087065,0.278298,-0.936494],[-0.051406,-0.371151,0.962296],[-0.023294,-0.845214,-0.592857],[0.107408,0.809782,-0.479865],[0.108167,0.783689,0.548206],[0.110226,-0.32589,-0.934099],[0.126479,0.458449,0.857834],[0.150837,0.029306,0.989092],[0.202822,-0.87707,0.505985],[0.210592,-1.008098,0.076151],[0.24093,0.900157,0.134932],[0.264529,0.497107,-0.761881],[0.312469,0.074567,-0.907304],[0.323013,-0.548594,0.788197],[0.343354,-0.89163,-0.337123],[0.351882,-0.619801,-0.694925],[0.474057,0.763367,-0.224131],[0.485843,0.546231,0.602613],[0.525256,-0.148138,0.814992],[0.562186,-0.789288,0.250764],[0.618606,0.662699,0.189339],[0.631178,0.450691,-0.506147],[0.679118,0.028151,-0.651569],[0.682377,-0.460813,0.532976],[0.694949,-0.672821,-0.16251],[0.703476,-0.400992,-0.520312],[0.7323,0.17134,0.576135],[0.865063,0.287808,0.162862],[0.872833,0.15678,-0.266972],[0.889422,-0.141336,0.29412],[0.897192,-0.272364,-0.135714]],
"edge":[[0,2],[2,7],[7,4],[4,0],[7,17],[17,16],[16,7],[17,30],[30,28],[28,16],[2,9],[9,18],[18,17],[30,41],[41,28],[41,44],[44,34],[34,28],[18,31],[31,30],[18,25],[25,31],[25,37],[37,42],[42,31],[42,50],[50,41],[37,47],[47,42],[47,53],[53,50],[16,11],[11,4],[11,6],[6,4],[11,23],[23,15],[15,6],[34,23],[23,27],[27,15],[27,40],[40,45],[45,35],[35,27],[34,40],[44,40],[50,51],[51,44],[51,52],[52,45],[53,51],[53,54],[54,52],[15,12],[12,5],[5,6],[12,8],[8,5],[12,24],[24,19],[19,8],[35,24],[35,36],[36,24],[36,29],[29,19],[45,46],[46,36],[52,46],[54,49],[49,46],[49,39],[39,29],[54,48],[48,49],[48,38],[38,39],[8,3],[3,1],[1,5],[3,10],[10,14],[14,22],[22,21],[21,13],[13,9],[0,1],[19,20],[20,10],[20,26],[26,14],[29,20],[39,26],[26,38],[38,33],[33,22],[48,43],[43,33],[13,25],[33,32],[32,21],[32,37],[43,32],[43,47]],
"face":[[7,17,16],[30,41,28],[18,25,31],[37,47,42],[4,11,6],[23,27,15],[34,44,40],[50,53,51],[5,12,8],[35,36,24],[45,52,46],[54,48,49],[19,29,20],[39,38,26],[33,43,32],[0,2,7,4],[17,30,28,16],[28,41,44,34],[18,31,30,17],[25,37,42,31],[42,47,53,50],[7,16,11,4],[11,23,15,6],[27,40,45,35],[34,40,27,23],[41,50,51,44],[51,53,54,52],[6,15,12,5],[12,24,19,8],[24,36,29,19],[45,46,36,35],[52,54,49,46],[49,48,38,39],[5,8,3,1],[20,26,14,10],[29,39,26,20],[38,48,43,33],[9,13,25,18],[22,33,32,21],[32,43,47,37],[2,9,18,17,7],[31,42,50,41,30],[16,28,34,23,11],[44,51,52,45,40],[15,27,35,24,12],[46,49,39,29,36],[8,19,20,10,3],[26,38,33,22,14],[21,32,37,25,13],[0,4,6,5,1],[43,48,54,53,47],[1,3,10,14,22,21,13,9,2,0]]},

"J80" : {
"name":"Parabidiminished Rhombicosidodecahedron (J80)",
"category":["Johnson Solid"],
"vertex":[[-0.981435,-0.157408,-0.109585],[-0.942153,-0.069788,0.327838],[-0.91551,0.22466,-0.333721],[-0.85195,0.366431,0.374044],[-0.835484,0.54841,-0.034822],[-0.80426,-0.38784,-0.450273],[-0.738335,-0.005772,-0.67441],[-0.701418,-0.15845,0.694914],[-0.648132,0.430447,-0.628204],[-0.611216,0.27777,0.74112],[-0.568107,0.754197,-0.329305],[-0.545291,0.659837,0.516984],[-0.528825,0.841816,0.108118],[-0.478303,-0.673069,-0.564096],[-0.371634,-0.05487,-0.926756],[-0.351184,-0.389527,0.851433],[-0.281432,0.381349,-0.88055],[-0.210926,-0.467282,-0.858579],[-0.205234,0.316291,0.926196],[-0.151948,0.905188,-0.396922],[-0.139309,0.698359,0.70206],[-0.128068,-0.904145,-0.407577],[-0.112666,0.992807,0.040501],[-0.044525,-0.09612,0.994373],[-0.025227,-0.674755,0.73761],[0.025227,0.674755,-0.73761],[0.044525,0.096121,-0.994373],[0.112666,-0.992807,-0.040501],[0.128068,0.904146,0.407577],[0.139309,-0.698358,-0.70206],[0.151948,-0.905188,0.396922],[0.205234,-0.316291,-0.926196],[0.210926,0.467282,0.858579],[0.281432,-0.381349,0.88055],[0.351184,0.389527,-0.851433],[0.371634,0.05487,0.926756],[0.478303,0.673069,0.564096],[0.528825,-0.841816,-0.108118],[0.545291,-0.659837,-0.516984],[0.568107,-0.754197,0.329305],[0.611216,-0.277769,-0.74112],[0.648133,-0.430447,0.628204],[0.701419,0.15845,-0.694914],[0.738335,0.005773,0.67441],[0.80426,0.387841,0.450273],[0.835484,-0.54841,0.034822],[0.85195,-0.366431,-0.374044],[0.91551,-0.22466,0.333721],[0.942153,0.069789,-0.327838],[0.981435,0.157408,0.109585]],
"edge":[[22,19],[19,10],[10,12],[12,22],[10,4],[4,12],[10,8],[8,2],[2,4],[19,25],[25,16],[16,8],[8,6],[6,2],[6,5],[5,0],[0,2],[16,14],[14,6],[16,26],[26,14],[26,31],[31,17],[17,14],[17,13],[13,5],[31,29],[29,17],[29,21],[21,13],[4,3],[3,11],[11,12],[3,9],[9,11],[3,1],[1,7],[7,9],[0,1],[24,15],[15,7],[21,27],[27,30],[30,24],[9,18],[18,20],[20,11],[18,32],[32,20],[18,23],[23,35],[35,32],[15,23],[23,33],[33,35],[33,41],[41,43],[43,35],[24,33],[30,39],[39,41],[27,37],[37,39],[32,36],[36,28],[28,20],[36,44],[44,49],[49,48],[48,42],[42,34],[34,25],[22,28],[43,44],[43,47],[47,49],[41,47],[39,45],[45,47],[45,46],[46,48],[37,45],[37,38],[38,46],[34,26],[46,40],[40,42],[40,31],[38,40],[38,29]],
"face":[[12,10,4],[8,6,2],[16,26,14],[31,29,17],[11,3,9],[20,18,32],[23,33,35],[43,41,47],[39,37,45],[46,38,40],[22,19,10,12],[10,8,2,4],[2,6,5,0],[16,14,6,8],[26,31,17,14],[17,29,21,13],[12,4,3,11],[3,1,7,9],[11,9,18,20],[18,23,35,32],[35,33,41,43],[15,24,33,23],[30,27,37,39],[20,32,36,28],[43,47,49,44],[41,39,45,47],[45,37,38,46],[25,34,26,16],[48,46,40,42],[40,38,29,31],[19,25,16,8,10],[14,17,13,5,6],[4,2,0,1,3],[9,7,15,23,18],[24,30,39,41,33],[32,35,43,44,36],[47,45,46,48,49],[42,40,31,26,34],[22,12,11,20,28],[38,37,27,21,29],[24,15,7,1,0,5,13,21,27,30],[28,36,44,49,48,42,34,25,19,22]]},

"J81" : {
"name":"Metabidiminished Rhombicosidodecahedron (J81)",
"category":["Johnson Solid"],
"vertex":[[-0.91554,-0.17156,0.190699],[-0.874123,-0.21861,-0.254883],[-0.873513,0.274357,0.14752],[-0.832096,0.227307,-0.298062],[-0.790984,-0.567471,0.016881],[-0.738991,-0.290113,0.587244],[-0.680957,0.599954,-0.096163],[-0.670991,0.431396,0.517379],[-0.630562,-0.413291,-0.579305],[-0.614436,-0.686024,0.413427],[-0.587852,0.082534,0.789144],[-0.562561,0.308217,-0.64917],[-0.547423,-0.762153,-0.30754],[-0.478435,0.756993,0.273697],[-0.438006,-0.087694,-0.822987],[-0.411421,0.680864,-0.44727],[-0.301886,0.63844,0.670242],[-0.277887,-0.681242,-0.658648],[-0.261761,-0.953976,0.334084],[-0.220345,-1.001026,-0.111498],[-0.218747,0.289578,0.942007],[-0.16786,0.486183,-0.771692],[-0.085331,-0.355646,-0.90233],[-0.083733,0.934958,0.151175],[-0.043304,0.090271,-0.945509],[-0.042317,0.887908,-0.294407],[0.049191,-0.920115,-0.462606],[0.092815,0.816405,0.54772],[0.184323,-0.991618,0.379522],[0.201245,0.693227,-0.618829],[0.225739,-1.038668,-0.06606],[0.227337,0.251936,0.987445],[0.360753,-0.393288,-0.856892],[0.362351,0.897316,0.196613],[0.40278,0.052629,-0.900071],[0.403767,0.850266,-0.24897],[0.419893,0.577533,0.743762],[0.443892,-0.74215,-0.585128],[0.553427,-0.784574,0.532385],[0.553919,0.425276,-0.698172],[0.580011,-0.016016,0.908102],[0.62044,-0.860702,-0.188582],[0.689428,0.658443,0.392655],[0.704567,-0.411927,0.734284],[0.756442,0.582315,-0.328312],[0.772567,0.309582,0.664419],[0.822963,-0.703664,0.181277],[0.93299,0.463762,0.068233],[0.974102,-0.331017,0.383177],[1.016129,0.1149,0.339998]],
"edge":[[44,39],[39,29],[29,35],[35,44],[29,25],[25,35],[29,21],[21,15],[15,25],[39,34],[34,24],[24,21],[21,11],[11,15],[11,3],[3,6],[6,15],[24,14],[14,11],[24,22],[22,14],[22,17],[17,8],[8,14],[8,1],[1,3],[17,12],[12,8],[12,4],[4,1],[25,23],[23,33],[33,35],[23,27],[27,33],[23,13],[13,16],[16,27],[6,13],[13,7],[7,16],[7,10],[10,20],[20,16],[6,2],[2,7],[3,2],[1,0],[0,2],[0,5],[5,10],[4,0],[4,9],[9,5],[27,36],[36,42],[42,33],[36,45],[45,42],[36,31],[31,40],[40,45],[20,31],[38,43],[43,40],[9,18],[18,28],[28,38],[45,49],[49,47],[47,42],[49,48],[48,46],[46,41],[41,37],[37,32],[32,34],[44,47],[43,48],[38,46],[28,30],[30,41],[18,19],[19,30],[32,22],[30,26],[26,37],[26,17],[19,26],[19,12]],
"face":[[35,29,25],[21,11,15],[24,22,14],[17,12,8],[33,23,27],[13,7,16],[6,3,2],[1,4,0],[42,36,45],[30,19,26],[44,39,29,35],[29,21,15,25],[15,11,3,6],[24,14,11,21],[22,17,8,14],[8,12,4,1],[35,25,23,33],[23,13,16,27],[16,7,10,20],[6,2,7,13],[3,1,0,2],[0,4,9,5],[33,27,36,42],[36,31,40,45],[42,45,49,47],[43,38,46,48],[28,18,19,30],[34,32,22,24],[41,30,26,37],[26,19,12,17],[39,34,24,21,29],[14,8,1,3,11],[25,15,6,13,23],[2,0,5,10,7],[27,16,20,31,36],[45,40,43,48,49],[38,28,30,41,46],[37,26,17,22,32],[44,35,33,42,47],[19,18,9,4,12],[38,43,40,31,20,10,5,9,18,28],[47,49,48,46,41,37,32,34,39,44]]},

"J82" : {
"name":"Gyrate Bidiminished Rhombicosidodecahedron (J82)",
"category":["Johnson Solid"],
"vertex":[[-0.915244,-0.149547,0.004878],[-0.857812,0.261033,-0.170045],[-0.853796,0.017864,0.418001],[-0.796364,0.428444,0.243078],[-0.772518,-0.333547,-0.380149],[-0.759676,-0.571754,0.001381],[-0.715086,0.077033,-0.555071],[-0.660252,-0.300878,0.669827],[-0.638771,0.334916,0.65404],[-0.609317,0.503159,-0.456572],[-0.602083,-0.665282,0.412342],[-0.509893,0.774035,0.211875],[-0.463372,-0.606112,-0.56073],[-0.45053,-0.844319,-0.1792],[-0.445227,0.016174,0.905866],[-0.394292,0.820211,-0.220533],[-0.370445,0.05822,-0.84376],[-0.3523,0.680507,0.622836],[-0.292937,-0.937847,0.231761],[-0.264676,0.484346,-0.745261],[-0.214877,-0.363987,-0.847257],[-0.105889,-0.863132,-0.467889],[-0.103806,0.922633,0.336308],[-0.049651,0.801399,-0.509222],[-0.039139,0.164772,1.0303],[0.011796,0.968809,-0.096099],[0.018293,0.575352,0.855378],[0.04447,0.211781,-0.925842],[0.142605,-0.621006,-0.754417],[0.149102,-1.014463,0.197061],[0.200037,-0.210426,-0.929339],[0.264704,-0.968287,-0.235347],[0.266787,0.817478,0.56885],[0.392388,0.724782,-0.543923],[0.4029,0.088156,0.9956],[0.450558,0.360379,-0.801408],[0.453835,0.892193,-0.1308],[0.460331,0.498736,0.820677],[0.513198,-0.726161,-0.521875],[0.55519,-0.865866,0.321494],[0.606125,-0.061828,-0.804905],[0.611428,0.798665,0.280161],[0.670792,-0.819689,-0.110913],[0.712045,-0.18441,0.815019],[0.770215,-0.548813,0.557534],[0.799669,-0.38057,-0.553078],[0.804972,0.479923,0.531988],[0.957263,-0.474098,-0.142117],[0.96054,0.057716,0.528491],[1.01871,-0.306688,0.271006]],
"edge":[[36,33],[33,23],[23,25],[25,36],[23,15],[15,25],[23,19],[19,9],[9,15],[33,35],[35,27],[27,19],[27,16],[16,19],[16,6],[6,9],[30,20],[20,16],[27,30],[30,28],[28,20],[28,21],[21,12],[12,20],[12,4],[4,6],[21,13],[13,12],[13,5],[5,4],[15,11],[11,22],[22,25],[11,17],[17,22],[11,3],[3,8],[8,17],[9,1],[1,3],[3,2],[2,8],[2,7],[7,14],[14,8],[1,0],[0,2],[6,1],[4,0],[0,5],[5,10],[10,7],[13,18],[18,10],[17,26],[26,32],[32,22],[26,37],[37,32],[26,24],[24,34],[34,37],[14,24],[44,43],[43,34],[18,29],[29,39],[39,44],[37,46],[46,41],[41,32],[46,48],[48,49],[49,47],[47,45],[45,40],[40,35],[36,41],[43,48],[44,49],[39,42],[42,47],[29,31],[31,42],[40,30],[42,38],[38,45],[38,28],[31,38],[31,21]],
"face":[[25,23,15],[27,16,19],[30,28,20],[21,13,12],[22,11,17],[3,2,8],[9,6,1],[4,5,0],[32,26,37],[42,31,38],[36,33,23,25],[23,19,9,15],[19,16,6,9],[30,20,16,27],[28,21,12,20],[12,13,5,4],[25,15,11,22],[11,3,8,17],[8,2,7,14],[1,0,2,3],[6,4,0,1],[5,13,18,10],[22,17,26,32],[26,24,34,37],[32,37,46,41],[43,44,49,48],[39,29,31,42],[35,40,30,27],[47,42,38,45],[38,31,21,28],[33,35,27,19,23],[20,12,4,6,16],[15,9,1,3,11],[0,5,10,7,2],[17,8,14,24,26],[37,34,43,48,46],[44,39,42,47,49],[45,38,28,30,40],[36,25,22,32,41],[31,29,18,13,21],[44,43,34,24,14,7,10,18,29,39],[41,46,48,49,47,45,40,35,33,36]]},

"J83" : {
"name":"Tridiminished Rhombicosidodecahedron (J83)",
"category":["Johnson Solid"],
"vertex":[[-0.932936,0.189273,0.192295],[-0.922398,0.241407,-0.253129],[-0.911995,-0.249962,0.280987],[-0.894943,-0.165606,-0.439724],[-0.888514,-0.469289,-0.109623],[-0.719187,0.580372,0.243128],[-0.712758,0.27669,0.57323],[-0.708649,0.632507,-0.202295],[-0.691817,-0.162545,0.661922],[-0.636773,-0.433068,-0.690809],[-0.630343,-0.736751,-0.360707],[-0.352393,0.77395,0.41407],[-0.345964,0.470268,0.744172],[-0.335341,0.858306,-0.306641],[-0.31208,-0.240428,0.887678],[-0.246498,-0.458817,-0.910477],[-0.236095,-0.950186,-0.376361],[-0.115163,0.945723,0.074294],[-0.098331,0.150671,0.938511],[0.001135,-0.778414,-0.716137],[0.027344,0.696067,0.639826],[0.054934,0.832556,-0.526309],[0.082168,-0.453864,0.872024],[0.12681,-0.233018,-1.014822],[0.143641,-1.02807,-0.150605],[0.264573,0.867839,0.30005],[0.274976,0.37647,0.834165],[0.275112,0.919973,-0.145374],[0.295917,-0.062764,0.922857],[0.313104,0.565095,-0.777393],[0.340339,-0.721326,0.620939],[0.340559,0.158081,-0.963989],[0.36382,-0.940653,0.23033],[0.374442,-0.552615,-0.820483],[0.380871,-0.856297,-0.490381],[0.658822,0.654404,0.284396],[0.665251,0.350721,0.614498],[0.66936,0.706538,-0.161028],[0.686192,-0.088513,0.703189],[0.692841,0.487211,-0.551637],[0.713646,-0.495527,0.516594],[0.720295,0.080198,-0.738233],[0.737127,-0.714854,0.125984],[0.741236,-0.359037,-0.649541],[0.747665,-0.662719,-0.31944]],
"edge":[[35,37],[37,27],[27,25],[25,35],[27,17],[17,25],[27,21],[21,13],[13,17],[37,39],[39,29],[29,21],[1,7],[7,13],[29,31],[31,23],[23,15],[15,9],[9,3],[3,1],[17,11],[11,20],[20,25],[11,12],[12,20],[11,5],[5,6],[6,12],[7,5],[5,0],[0,6],[0,2],[2,8],[8,6],[1,0],[3,4],[4,2],[9,10],[10,4],[12,18],[18,26],[26,20],[18,28],[28,26],[18,14],[14,22],[22,28],[8,14],[32,30],[30,22],[10,16],[16,24],[24,32],[28,38],[38,36],[36,26],[38,40],[40,42],[42,44],[44,43],[43,41],[41,39],[35,36],[30,40],[32,42],[24,34],[34,44],[16,19],[19,34],[41,31],[34,33],[33,43],[33,23],[19,33],[19,15]],
"face":[[25,27,17],[20,11,12],[5,0,6],[26,18,28],[34,19,33],[35,37,27,25],[27,21,13,17],[25,17,11,20],[11,5,6,12],[6,0,2,8],[7,1,0,5],[3,9,10,4],[20,12,18,26],[18,14,22,28],[26,28,38,36],[30,32,42,40],[24,16,19,34],[39,41,31,29],[44,34,33,43],[33,19,15,23],[37,39,29,21,27],[17,13,7,5,11],[1,3,4,2,0],[12,6,8,14,18],[28,22,30,40,38],[32,24,34,44,42],[43,33,23,31,41],[35,25,20,26,36],[19,16,10,9,15],[1,7,13,21,29,31,23,15,9,3],[32,30,22,14,8,2,4,10,16,24],[36,38,40,42,44,43,41,39,37,35]]},

"J84" : {
"name":"Snub Disphenoid (J84)",
"category":["Johnson Solid"],
"vertex":[[-0.768016,0.559678,0.635844],[-0.720709,-0.093633,-0.405339],[-0.6358,-0.662351,0.681929],[0.09848,0.800885,-0.202562],[0.269587,-0.77416,-0.143135],[0.285934,-0.010665,-1.107297],[0.352377,0.066396,0.750712],[1.118151,0.11385,-0.210152]],
"edge":[[6,7],[7,3],[3,6],[7,5],[5,3],[5,1],[1,3],[4,7],[6,4],[4,5],[4,1],[4,2],[2,1],[2,0],[0,1],[0,3],[6,2],[6,0]],
"face":[[6,7,3],[3,7,5],[3,5,1],[4,7,6],[7,4,5],[5,4,1],[4,2,1],[1,2,0],[1,0,3],[6,2,4],[2,6,0],[0,6,3]]},

"J85" : {
"name":"Snub Square Antiprism (J85)",
"category":["Johnson Solid"],
"vertex":[[-0.984789,0.388776,-0.318546],[-0.905986,-0.50645,-0.380955],[-0.774402,-0.096785,0.410496],[-0.648503,0.795226,0.411689],[-0.32762,0.028199,-0.818195],[-0.278924,-0.81528,0.187334],[-0.177548,0.78687,-0.356208],[-0.134682,-0.843968,-0.701432],[-0.06669,0.257644,0.840681],[0.229454,0.996879,0.419536],[0.428788,-0.460851,0.617519],[0.523163,-0.229235,-0.671807],[0.55373,-0.948137,-0.129793],[0.673235,0.529435,-0.20982],[0.811213,0.353538,0.662851],[1.079561,-0.235865,0.03665]],
"edge":[[13,11],[11,4],[4,6],[6,13],[13,9],[9,14],[14,13],[6,9],[6,3],[3,9],[11,15],[15,12],[12,11],[13,15],[14,15],[4,7],[7,1],[1,4],[11,7],[12,7],[6,0],[0,3],[4,0],[1,0],[2,5],[5,10],[10,8],[8,2],[2,3],[0,2],[8,3],[8,9],[5,1],[7,5],[2,1],[10,12],[15,10],[5,12],[8,14],[10,14]],
"face":[[13,9,14],[9,13,6],[9,6,3],[11,15,12],[15,11,13],[15,13,14],[4,7,1],[7,4,11],[7,11,12],[6,0,3],[0,6,4],[0,4,1],[2,3,0],[3,2,8],[3,8,9],[5,1,7],[1,5,2],[1,2,0],[10,12,15],[12,10,5],[12,5,7],[8,14,9],[14,8,10],[14,10,15],[13,11,4,6],[2,5,10,8]]},

"J86" : {
"name":"Sphenocorona (J86)",
"category":["Johnson Solid"],
"vertex":[[-1.10165,-0.110367,-0.010645],[-0.640942,0.825699,0.365159],[-0.414409,0.468967,-0.660083],[-0.324965,-0.634882,-0.603383],[-0.317654,-0.702618,0.503439],[0.143053,0.233445,0.879242],[0.402426,0.84303,-0.010043],[0.585642,-0.008843,-0.69593],[0.603895,-0.925247,-0.07178],[1.064602,0.010817,0.304023]],
"edge":[[1,0],[0,4],[4,5],[5,1],[4,8],[8,9],[9,5],[7,3],[3,2],[2,7],[2,1],[1,6],[6,2],[3,0],[0,2],[5,6],[9,6],[3,4],[3,8],[9,7],[7,6],[8,7]],
"face":[[7,3,2],[2,1,6],[2,3,0],[2,0,1],[1,5,6],[6,5,9],[3,4,0],[4,3,8],[9,7,6],[9,8,7],[7,8,3],[6,7,2],[1,0,4,5],[5,4,8,9]]},

"J87" : {
"name":"Augmented sphenocorona (J87)",
"category":["Johnson Solid"],
"vertex":[[-0.858193,-0.792464,0.432564],[-0.785643,0.057917,-0.211154],[-0.533044,0.147795,0.823687],[-0.229952,0.904287,0.131849],[-0.212337,0.637025,-0.903062],[-0.091064,-0.748583,-0.310653],[0.161537,-0.658707,0.724189],[0.482242,-0.169476,-1.002562],[0.505859,0.352206,0.676436],[0.693906,0.639069,-0.336051],[0.86669,-0.369064,-0.025245]],
"edge":[[5,0],[0,1],[1,5],[1,4],[4,7],[7,5],[9,3],[3,8],[8,9],[8,6],[6,10],[10,8],[3,2],[2,8],[2,6],[6,5],[5,10],[7,10],[3,1],[1,2],[3,4],[7,9],[9,10],[4,9],[6,0],[2,0]],
"face":[[5,0,1],[9,3,8],[8,6,10],[8,3,2],[8,2,6],[6,5,10],[10,5,7],[3,1,2],[1,3,4],[7,9,10],[7,4,9],[9,4,3],[10,9,8],[6,0,5],[6,2,0],[0,2,1],[5,1,4,7]]},

"J88" : {
"name":"Sphenomegacorona (J88)",
"category":["Johnson Solid"],
"vertex":[[-0.710639,-0.297668,-0.15267],[-0.651151,-0.105949,0.829841],[-0.621335,0.64788,0.169179],[-0.614162,-1.052419,0.500527],[-0.166396,0.361269,-0.677289],[-0.002058,-0.993534,-0.291612],[0.165944,0.471894,0.764865],[0.225836,-0.507426,0.555374],[0.279224,1.020494,-0.066987],[0.542185,-0.334598,-0.816231],[0.770079,0.151511,0.030755],[0.782476,0.638548,-0.845752]],
"edge":[[7,5],[5,9],[9,10],[10,7],[6,7],[10,6],[3,7],[7,1],[1,3],[3,5],[10,11],[11,8],[8,10],[9,11],[6,1],[8,6],[4,9],[5,0],[0,4],[2,4],[0,2],[11,4],[4,8],[0,3],[1,0],[8,2],[2,6],[2,1]],
"face":[[6,7,10],[3,7,1],[3,5,7],[10,11,8],[10,9,11],[1,7,6],[6,10,8],[2,4,0],[11,4,8],[11,9,4],[0,3,1],[0,5,3],[8,2,6],[8,4,2],[2,1,6],[2,0,1],[7,5,9,10],[4,9,5,0]]},

"J89" : {
"name":"Hebesphenomegacorona (J89)",
"category":["Johnson Solid"],
"vertex":[[-0.83117,0.133549,-0.011648],[-0.700039,-0.806136,-0.111242],[-0.631074,-0.403619,0.750934],[-0.576095,-0.225432,-0.857931],[-0.446282,0.532211,0.764918],[-0.172487,0.817558,-0.103263],[0.082589,0.458576,-0.949546],[0.105206,-0.849768,-0.620949],[0.145599,-0.76155,0.32811],[0.235014,-0.09212,1.001899],[0.469795,0.739577,0.597817],[0.750772,0.700456,-0.313032],[0.76389,-0.165759,-0.712564],[0.804283,-0.077541,0.236495]],
"edge":[[8,7],[7,12],[12,13],[13,8],[9,8],[13,9],[1,8],[8,2],[2,1],[1,7],[13,11],[11,10],[10,13],[12,11],[9,2],[10,9],[3,6],[6,12],[7,3],[6,11],[1,3],[5,6],[3,0],[0,5],[4,5],[0,4],[11,5],[5,10],[0,1],[2,0],[10,4],[4,9],[4,2]],
"face":[[9,8,13],[1,8,2],[1,7,8],[13,11,10],[13,12,11],[2,8,9],[9,13,10],[12,6,11],[3,7,1],[4,5,0],[11,5,10],[11,6,5],[0,1,2],[0,3,1],[10,4,9],[10,5,4],[4,2,9],[4,0,2],[8,7,12,13],[3,6,12,7],[5,6,3,0]]},

"J90" : {
"name":"Disphenocingulum (J90)",
"category":["Johnson Solid"],
"vertex":[[-1.052782,0.264006,0.098264],[-0.753999,-0.411397,0.610751],[-0.732127,-0.483215,-0.285043],[-0.599216,0.763406,-0.495842],[-0.413906,0.414477,0.712494],[-0.278562,0.016184,-0.879148],[-0.105415,-0.890983,0.213994],[0.009423,-0.81027,-0.673913],[0.03966,0.913876,0.118388],[0.101994,-0.305887,0.864167],[0.267869,0.713733,-0.727747],[0.47671,0.507934,0.790906],[0.590474,-0.124774,-0.697516],[0.722293,-0.806255,-0.126296],[0.797883,0.460322,-0.047343],[0.929701,-0.221158,0.523878]],
"edge":[[13,6],[6,7],[7,13],[9,6],[13,15],[15,9],[15,11],[11,9],[12,13],[7,12],[12,14],[14,15],[14,11],[12,10],[10,14],[7,5],[5,12],[5,10],[5,3],[3,10],[5,2],[2,0],[0,3],[6,2],[2,7],[6,1],[1,2],[1,0],[0,4],[4,8],[8,3],[8,10],[8,14],[8,11],[4,11],[4,9],[9,1],[4,1]],
"face":[[13,6,7],[9,15,11],[12,13,7],[15,14,11],[12,10,14],[12,7,5],[12,5,10],[10,5,3],[7,6,2],[5,7,2],[2,6,1],[2,1,0],[10,3,8],[10,8,14],[8,11,14],[8,4,11],[11,4,9],[9,1,6],[4,1,9],[0,1,4],[9,6,13,15],[15,13,12,14],[5,2,0,3],[3,0,4,8]]},

"J91" : {
"name":"Bilunabirotunda (J91)",
"category":["Johnson Solid"],
"vertex":[[-0.932446,-0.071511,0.062428],[-0.890073,0.716495,0.434115],[-0.483326,0.038238,0.802122],[-0.479875,-0.798287,-0.104525],[-0.363346,-0.08879,-0.598427],[-0.294782,1.186233,0.002976],[-0.030753,-0.688537,0.635167],[0.030753,0.688538,-0.635171],[0.294779,-1.186232,-0.002974],[0.363347,0.088791,0.598425],[0.479874,0.79829,0.104525],[0.483327,-0.038241,-0.802125],[0.890072,-0.716499,-0.434115],[0.932449,0.071511,-0.062429]],
"edge":[[13,11],[11,7],[7,10],[10,13],[13,12],[12,11],[11,4],[4,7],[7,5],[5,10],[10,9],[9,13],[9,6],[6,8],[8,12],[8,3],[3,4],[4,0],[0,1],[1,5],[1,2],[2,9],[6,3],[3,0],[0,2],[2,6]],
"face":[[11,13,12],[7,11,4],[10,7,5],[13,10,9],[3,8,6],[4,3,0],[2,1,0],[9,2,6],[13,11,7,10],[6,2,0,3],[12,13,9,6,8],[11,12,8,3,4],[5,7,4,0,1],[10,5,1,2,9]]},

"J92" : {
"name":"Triangular Hebesphenorotunda (J92)",
"category":["Johnson Solid"],
"vertex":[[-0.748928,0.557858,-0.030371],[-0.638635,0.125804,-0.670329],[-0.593696,0.259282,0.67329],[-0.427424,0.876636,-0.665507],[-0.373109,-0.604827,-0.606627],[-0.32817,-0.471348,0.736992],[-0.217876,-0.903403,0.097033],[-0.141658,1.042101,0.041134],[-0.021021,0.094954,1.176701],[0.013575,0.743525,0.744795],[0.036802,0.343022,-0.994341],[0.267732,-1.036179,-0.498733],[0.302328,-0.387609,-0.93064],[0.443205,-0.438661,0.847867],[0.499183,0.610749,0.149029],[0.553499,-0.870715,0.207908],[0.609478,0.178694,-0.490931],[0.76471,-0.119883,0.212731]],
"edge":[[11,12],[12,16],[16,17],[17,15],[15,11],[11,4],[4,12],[11,6],[6,4],[15,6],[15,13],[13,5],[5,6],[17,13],[8,13],[17,14],[14,9],[9,8],[8,5],[2,5],[8,2],[9,2],[7,9],[14,7],[7,0],[0,2],[16,14],[16,10],[10,3],[3,7],[3,0],[3,1],[1,0],[10,1],[4,1],[10,12]],
"face":[[12,11,4],[11,6,4],[6,11,15],[13,15,17],[5,13,8],[2,5,8],[2,8,9],[7,9,14],[16,14,17],[3,0,7],[3,1,0],[1,3,10],[12,10,16],[6,15,13,5],[2,9,7,0],[12,4,1,10],[11,12,16,17,15],[8,13,17,14,9],[16,10,3,7,14],[1,4,6,5,2,0]]}

}

},{}],49:[function(require,module,exports){
module.exports={
  "Tetrahedron" : {
  "name":"Tetrahedron",
  "category":["Platonic Solid"],
  "vertex":[[0,0,1.732051],[1.632993,0,-0.5773503],[-0.8164966,1.414214,-0.5773503],[-0.8164966,-1.414214,-0.5773503]],
  "edge":[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],
  "face":[[0,1,2],[0,2,3],[0,3,1],[1,3,2]]},

  "Cube": {
  "name":"Cube",
  "category":["Platonic Solid"],
  "vertex":[[0,0,1.224745],[1.154701,0,0.4082483],[-0.5773503,1,0.4082483],[-0.5773503,-1,0.4082483],[0.5773503,1,-0.4082483],[0.5773503,-1,-0.4082483],[-1.154701,0,-0.4082483],[0,0,-1.224745]],
  "edge":[[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,6],[4,7],[5,7],[6,7]],
  "face":[[0,1,4,2],[0,2,6,3],[0,3,5,1],[1,5,7,4],[2,4,7,6],[3,6,7,5]]},

  "Octahedron": {
  "name":"Octahedron",
  "category":["Platonic Solid"],
  "vertex":[[0,0,1.414214],[1.414214,0,0],[0,1.414214,0],[-1.414214,0,0],[0,-1.414214,0],[0,0,-1.414214]],
  "edge":[[0,1],[0,2],[0,3],[0,4],[1,2],[1,4],[1,5],[2,3],[2,5],[3,4],[3,5],[4,5]],
  "face":[[0,1,2],[0,2,3],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[3,5,4]]},

  "Dodecahedron": {
  "name":"Dodecahedron",
  "category":["Platonic Solid"],
  "vertex":[[0,0,1.070466],[0.7136442,0,0.7978784],[-0.3568221,0.618034,0.7978784],[-0.3568221,-0.618034,0.7978784],[0.7978784,0.618034,0.3568221],[0.7978784,-0.618034,0.3568221],[-0.9341724,0.381966,0.3568221],[0.1362939,1,0.3568221],[0.1362939,-1,0.3568221],[-0.9341724,-0.381966,0.3568221],[0.9341724,0.381966,-0.3568221],[0.9341724,-0.381966,-0.3568221],[-0.7978784,0.618034,-0.3568221],[-0.1362939,1,-0.3568221],[-0.1362939,-1,-0.3568221],[-0.7978784,-0.618034,-0.3568221],[0.3568221,0.618034,-0.7978784],[0.3568221,-0.618034,-0.7978784],[-0.7136442,0,-0.7978784],[0,0,-1.070466]],
  "edge":[[0,1],[0,2],[0,3],[1,4],[1,5],[2,6],[2,7],[3,8],[3,9],[4,7],[4,10],[5,8],[5,11],[6,9],[6,12],[7,13],[8,14],[9,15],[10,11],[10,16],[11,17],[12,13],[12,18],[13,16],[14,15],[14,17],[15,18],[16,19],[17,19],[18,19]],
  "face":[[0,1,4,7,2],[0,2,6,9,3],[0,3,8,5,1],[1,5,11,10,4],[2,7,13,12,6],[3,9,15,14,8],[4,10,16,13,7],[5,8,14,17,11],[6,12,18,15,9],[10,11,17,19,16],[12,13,16,19,18],[14,15,18,19,17]]},

  "Icosahedron" : {
  "name":"Icosahedron",
  "category":["Platonic Solid"],
  "vertex":[[0,0,1.175571],[1.051462,0,0.5257311],[0.3249197,1,0.5257311],[-0.8506508,0.618034,0.5257311],[-0.8506508,-0.618034,0.5257311],[0.3249197,-1,0.5257311],[0.8506508,0.618034,-0.5257311],[0.8506508,-0.618034,-0.5257311],[-0.3249197,1,-0.5257311],[-1.051462,0,-0.5257311],[-0.3249197,-1,-0.5257311],[0,0,-1.175571]],
  "edge":[[0,1],[0,2],[0,3],[0,4],[0,5],[1,2],[1,5],[1,6],[1,7],[2,3],[2,6],[2,8],[3,4],[3,8],[3,9],[4,5],[4,9],[4,10],[5,7],[5,10],[6,7],[6,8],[6,11],[7,10],[7,11],[8,9],[8,11],[9,10],[9,11],[10,11]],
  "face":[[0,1,2],[0,2,3],[0,3,4],[0,4,5],[0,5,1],[1,5,7],[1,7,6],[1,6,2],[2,6,8],[2,8,3],[3,8,9],[3,9,4],[4,9,10],[4,10,5],[5,10,7],[6,7,11],[6,11,8],[7,10,11],[8,11,9],[9,11,10]]}
}

},{}],50:[function(require,module,exports){
module.exports={
  "TriangularPrism" : {
  "name":"Triangular Prism",
  "category":["Prism"],
  "vertex":[[0,0,1.322876],[1.309307,0,0.1889822],[-0.9819805,0.8660254,0.1889822],[0.1636634,-1.299038,0.1889822],[0.3273268,0.8660254,-0.9449112],[-0.8183171,-0.4330127,-0.9449112]],
  "edge":[[0,3],[3,1],[1,0],[2,4],[4,5],[5,2],[1,4],[2,0],[5,3]],
  "face":[[0,3,1],[2,4,5],[0,1,4,2],[0,2,5,3],[1,3,5,4]]},

  "SquarePrism" : {
  "name":"Square Prism (Cube)",
  "category":["Prism"],
  "vertex":[[0,0,1.224745],[1.154701,0,0.4082483],[-0.5773503,1,0.4082483],[-0.5773503,-1,0.4082483],[0.5773503,1,-0.4082483],[0.5773503,-1,-0.4082483],[-1.154701,0,-0.4082483],[0,0,-1.224745]],
  "edge":[[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,6],[4,7],[5,7],[6,7]],
  "face":[[0,1,4,2],[0,2,6,3],[0,3,5,1],[1,5,7,4],[2,4,7,6],[3,6,7,5]]},

  "PentagonalPrism" : {
  "name":"Pentagonal Prism",
  "category":["Prism"],
  "vertex":[[0,0,1.159953],[1.013464,0,0.5642542],[-0.3501431,0.9510565,0.5642542],[-0.7715208,-0.6571639,0.5642542],[0.6633206,0.9510565,-0.03144481],[0.8682979,-0.6571639,-0.3996071],[-1.121664,0.2938926,-0.03144481],[-0.2348831,-1.063314,-0.3996071],[0.5181548,0.2938926,-0.9953061],[-0.5850262,-0.112257,-0.9953061]],
  "edge":[[0,1],[1,4],[4,2],[2,0],[2,6],[6,3],[3,0],[1,5],[5,8],[8,4],[6,9],[9,7],[7,3],[5,7],[9,8]],
  "face":[[0,1,4,2],[0,2,6,3],[1,5,8,4],[3,6,9,7],[5,7,9,8],[0,3,7,5,1],[2,4,8,9,6]]},

  "HexagonalPrism" : {
  "name":"Hexagonal Prism",
  "category":["Prism"],
  "vertex":[[0,0,1.118034],[0.8944272,0,0.6708204],[-0.2236068,0.8660254,0.6708204],[-0.7826238,-0.4330127,0.6708204],[0.6708204,0.8660254,0.2236068],[1.006231,-0.4330127,-0.2236068],[-1.006231,0.4330127,0.2236068],[-0.6708204,-0.8660254,-0.2236068],[0.7826238,0.4330127,-0.6708204],[0.2236068,-0.8660254,-0.6708204],[-0.8944272,0,-0.6708204],[0,0,-1.118034]],
  "edge":[[0,1],[1,4],[4,2],[2,0],[2,6],[6,3],[3,0],[1,5],[5,8],[8,4],[6,10],[10,7],[7,3],[5,9],[9,11],[11,8],[10,11],[9,7]],
  "face":[[0,1,4,2],[0,2,6,3],[1,5,8,4],[3,6,10,7],[5,9,11,8],[7,10,11,9],[0,3,7,9,5,1],[2,4,8,11,10,6]]},

  "HepatgonalPrism" : {
  "name":"Heptagonal Prism",
  "category":["Prism"],
  "vertex":[[0,0,1.090071],[0.796065,0,0.7446715],[-0.1498633,0.7818315,0.7446715],[-0.7396399,-0.2943675,0.7446715],[0.6462017,0.7818315,0.3992718],[1.049102,-0.2943675,-0.03143449],[-0.8895032,0.487464,0.3992718],[-0.8658909,-0.6614378,-0.03143449],[0.8992386,0.487464,-0.3768342],[0.5685687,-0.6614378,-0.6538232],[-1.015754,0.1203937,-0.3768342],[-0.2836832,-0.8247995,-0.6538232],[0.4187054,0.1203937,-0.9992228],[-0.4335465,-0.042968,-0.9992228]],
  "edge":[[0,1],[1,4],[4,2],[2,0],[2,6],[6,3],[3,0],[1,5],[5,8],[8,4],[6,10],[10,7],[7,3],[5,9],[9,12],[12,8],[10,13],[13,11],[11,7],[9,11],[13,12]],
  "face":[[0,1,4,2],[0,2,6,3],[1,5,8,4],[3,6,10,7],[5,9,12,8],[7,10,13,11],[9,11,13,12],[0,3,7,11,9,5,1],[2,4,8,12,13,10,6]]},

  "OctagonalPrism" : {
  "name":"Octagonal Prism",
  "category":["Prism"],
  "vertex":[[0,0,1.070722],[0.7148135,0,0.7971752],[-0.104682,0.7071068,0.7971752],[-0.6841528,-0.2071068,0.7971752],[0.6101315,0.7071068,0.5236279],[1.04156,-0.2071068,0.1367736],[-0.7888348,0.5,0.5236279],[-0.9368776,-0.5,0.1367736],[0.9368776,0.5,-0.1367736],[0.7888348,-0.5,-0.5236279],[-1.04156,0.2071068,-0.1367736],[-0.6101315,-0.7071068,-0.5236279],[0.6841528,0.2071068,-0.7971752],[0.104682,-0.7071068,-0.7971752],[-0.7148135,0,-0.7971752],[0,0,-1.070722]],
  "edge":[[0,1],[1,4],[4,2],[2,0],[2,6],[6,3],[3,0],[1,5],[5,8],[8,4],[6,10],[10,7],[7,3],[5,9],[9,12],[12,8],[10,14],[14,11],[11,7],[9,13],[13,15],[15,12],[14,15],[13,11]],
  "face":[[0,1,4,2],[0,2,6,3],[1,5,8,4],[3,6,10,7],[5,9,12,8],[7,10,14,11],[9,13,15,12],[11,14,15,13],[0,3,7,11,13,9,5,1],[2,4,8,12,15,14,10,6]]},

  "EnneagonalPrism" : {
  "name":"Enneagonal Prism",
  "category":["Prism"],
  "vertex":[[0,0,1.056872],[0.6472312,0,0.8355056],[-0.07571166,0.6427876,0.8355056],[-0.629518,-0.1503837,0.8355056],[0.5715195,0.6427876,0.6141395],[1.009329,-0.1503837,0.274987],[-0.7052297,0.4924039,0.6141395],[-0.9467644,-0.380785,0.274987],[0.9336172,0.4924039,0.05362089],[0.9168635,-0.380785,-0.3624113],[-1.022476,0.2620026,0.05362089],[-0.803296,-0.5833964,-0.3624113],[0.8411518,0.2620026,-0.5837774],[0.4131007,-0.5833964,-0.7784434],[-0.8790077,0.05939117,-0.5837774],[-0.2662433,-0.6634139,-0.7784434],[0.337389,0.05939117,-0.9998095],[-0.341955,-0.02062634,-0.9998095]],
  "edge":[[0,1],[1,4],[4,2],[2,0],[2,6],[6,3],[3,0],[1,5],[5,8],[8,4],[6,10],[10,7],[7,3],[5,9],[9,12],[12,8],[10,14],[14,11],[11,7],[9,13],[13,16],[16,12],[14,17],[17,15],[15,11],[13,15],[17,16]],
  "face":[[0,1,4,2],[0,2,6,3],[1,5,8,4],[3,6,10,7],[5,9,12,8],[7,10,14,11],[9,13,16,12],[11,14,17,15],[13,15,17,16],[0,3,7,11,15,13,9,5,1],[2,4,8,12,16,17,14,10,6]]},

  "DecagonalPrism" : {
  "name":"Decagonal Prism",
  "category":["Prism"],
  "vertex":[[0,0,1.046657],[0.5904836,0,0.8641878],[-0.05638617,0.5877853,0.8641878],[-0.5797148,-0.112257,0.8641878],[0.5340974,0.5877853,0.6817184],[0.9661914,-0.112257,0.3864765],[-0.636101,0.4755283,0.6817184],[-0.9272295,-0.2938926,0.3864765],[0.9098052,0.4755283,0.2040071],[0.9836156,-0.2938926,-0.2040071],[-0.9836156,0.2938926,0.2040071],[-0.9098052,-0.4755283,-0.2040071],[0.9272295,0.2938926,-0.3864765],[0.636101,-0.4755283,-0.6817184],[-0.9661914,0.112257,-0.3864765],[-0.5340974,-0.5877853,-0.6817184],[0.5797148,0.112257,-0.8641878],[0.05638617,-0.5877853,-0.8641878],[-0.5904836,0,-0.8641878],[0,0,-1.046657]],
  "edge":[[0,1],[1,4],[4,2],[2,0],[2,6],[6,3],[3,0],[1,5],[5,8],[8,4],[6,10],[10,7],[7,3],[5,9],[9,12],[12,8],[10,14],[14,11],[11,7],[9,13],[13,16],[16,12],[14,18],[18,15],[15,11],[13,17],[17,19],[19,16],[18,19],[17,15]],
  "face":[[0,1,4,2],[0,2,6,3],[1,5,8,4],[3,6,10,7],[5,9,12,8],[7,10,14,11],[9,13,16,12],[11,14,18,15],[13,17,19,16],[15,18,19,17],[0,3,7,11,15,17,13,9,5,1],[2,4,8,12,16,19,18,14,10,6]]}
}

},{}],51:[function(require,module,exports){
module.exports = {
  antiprisms: require('./data/antiprisms.json'),
  archimedean: require('./data/archimedean.json'),
  johnson: require('./data/johnson.json'),
  platonic: require('./data/platonic.json'),
  prisms: require('./data/prisms.json')
}

},{"./data/antiprisms.json":46,"./data/archimedean.json":47,"./data/johnson.json":48,"./data/platonic.json":49,"./data/prisms.json":50}],52:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],53:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.createREGL = factory());
}(this, (function () { 'use strict';

var isTypedArray = function (x) {
  return (
    x instanceof Uint8Array ||
    x instanceof Uint16Array ||
    x instanceof Uint32Array ||
    x instanceof Int8Array ||
    x instanceof Int16Array ||
    x instanceof Int32Array ||
    x instanceof Float32Array ||
    x instanceof Float64Array ||
    x instanceof Uint8ClampedArray
  )
};

var extend = function (base, opts) {
  var keys = Object.keys(opts);
  for (var i = 0; i < keys.length; ++i) {
    base[keys[i]] = opts[keys[i]];
  }
  return base
};

// Error checking and parameter validation.
//
// Statements for the form `check.someProcedure(...)` get removed by
// a browserify transform for optimized/minified bundles.
//
/* globals atob */
var endl = '\n';

// only used for extracting shader names.  if atob not present, then errors
// will be slightly crappier
function decodeB64 (str) {
  if (typeof atob !== 'undefined') {
    return atob(str)
  }
  return 'base64:' + str
}

function raise (message) {
  var error = new Error('(regl) ' + message);
  console.error(error);
  throw error
}

function check (pred, message) {
  if (!pred) {
    raise(message);
  }
}

function encolon (message) {
  if (message) {
    return ': ' + message
  }
  return ''
}

function checkParameter (param, possibilities, message) {
  if (!(param in possibilities)) {
    raise('unknown parameter (' + param + ')' + encolon(message) +
          '. possible values: ' + Object.keys(possibilities).join());
  }
}

function checkIsTypedArray (data, message) {
  if (!isTypedArray(data)) {
    raise(
      'invalid parameter type' + encolon(message) +
      '. must be a typed array');
  }
}

function checkTypeOf (value, type, message) {
  if (typeof value !== type) {
    raise(
      'invalid parameter type' + encolon(message) +
      '. expected ' + type + ', got ' + (typeof value));
  }
}

function checkNonNegativeInt (value, message) {
  if (!((value >= 0) &&
        ((value | 0) === value))) {
    raise('invalid parameter type, (' + value + ')' + encolon(message) +
          '. must be a nonnegative integer');
  }
}

function checkOneOf (value, list, message) {
  if (list.indexOf(value) < 0) {
    raise('invalid value' + encolon(message) + '. must be one of: ' + list);
  }
}

var constructorKeys = [
  'gl',
  'canvas',
  'container',
  'attributes',
  'pixelRatio',
  'extensions',
  'optionalExtensions',
  'profile',
  'onDone'
];

function checkConstructor (obj) {
  Object.keys(obj).forEach(function (key) {
    if (constructorKeys.indexOf(key) < 0) {
      raise('invalid regl constructor argument "' + key + '". must be one of ' + constructorKeys);
    }
  });
}

function leftPad (str, n) {
  str = str + '';
  while (str.length < n) {
    str = ' ' + str;
  }
  return str
}

function ShaderFile () {
  this.name = 'unknown';
  this.lines = [];
  this.index = {};
  this.hasErrors = false;
}

function ShaderLine (number, line) {
  this.number = number;
  this.line = line;
  this.errors = [];
}

function ShaderError (fileNumber, lineNumber, message) {
  this.file = fileNumber;
  this.line = lineNumber;
  this.message = message;
}

function guessCommand () {
  var error = new Error();
  var stack = (error.stack || error).toString();
  var pat = /compileProcedure.*\n\s*at.*\((.*)\)/.exec(stack);
  if (pat) {
    return pat[1]
  }
  var pat2 = /compileProcedure.*\n\s*at\s+(.*)(\n|$)/.exec(stack);
  if (pat2) {
    return pat2[1]
  }
  return 'unknown'
}

function guessCallSite () {
  var error = new Error();
  var stack = (error.stack || error).toString();
  var pat = /at REGLCommand.*\n\s+at.*\((.*)\)/.exec(stack);
  if (pat) {
    return pat[1]
  }
  var pat2 = /at REGLCommand.*\n\s+at\s+(.*)\n/.exec(stack);
  if (pat2) {
    return pat2[1]
  }
  return 'unknown'
}

function parseSource (source, command) {
  var lines = source.split('\n');
  var lineNumber = 1;
  var fileNumber = 0;
  var files = {
    unknown: new ShaderFile(),
    0: new ShaderFile()
  };
  files.unknown.name = files[0].name = command || guessCommand();
  files.unknown.lines.push(new ShaderLine(0, ''));
  for (var i = 0; i < lines.length; ++i) {
    var line = lines[i];
    var parts = /^\s*\#\s*(\w+)\s+(.+)\s*$/.exec(line);
    if (parts) {
      switch (parts[1]) {
        case 'line':
          var lineNumberInfo = /(\d+)(\s+\d+)?/.exec(parts[2]);
          if (lineNumberInfo) {
            lineNumber = lineNumberInfo[1] | 0;
            if (lineNumberInfo[2]) {
              fileNumber = lineNumberInfo[2] | 0;
              if (!(fileNumber in files)) {
                files[fileNumber] = new ShaderFile();
              }
            }
          }
          break
        case 'define':
          var nameInfo = /SHADER_NAME(_B64)?\s+(.*)$/.exec(parts[2]);
          if (nameInfo) {
            files[fileNumber].name = (nameInfo[1]
                ? decodeB64(nameInfo[2])
                : nameInfo[2]);
          }
          break
      }
    }
    files[fileNumber].lines.push(new ShaderLine(lineNumber++, line));
  }
  Object.keys(files).forEach(function (fileNumber) {
    var file = files[fileNumber];
    file.lines.forEach(function (line) {
      file.index[line.number] = line;
    });
  });
  return files
}

function parseErrorLog (errLog) {
  var result = [];
  errLog.split('\n').forEach(function (errMsg) {
    if (errMsg.length < 5) {
      return
    }
    var parts = /^ERROR\:\s+(\d+)\:(\d+)\:\s*(.*)$/.exec(errMsg);
    if (parts) {
      result.push(new ShaderError(
        parts[1] | 0,
        parts[2] | 0,
        parts[3].trim()));
    } else if (errMsg.length > 0) {
      result.push(new ShaderError('unknown', 0, errMsg));
    }
  });
  return result
}

function annotateFiles (files, errors) {
  errors.forEach(function (error) {
    var file = files[error.file];
    if (file) {
      var line = file.index[error.line];
      if (line) {
        line.errors.push(error);
        file.hasErrors = true;
        return
      }
    }
    files.unknown.hasErrors = true;
    files.unknown.lines[0].errors.push(error);
  });
}

function checkShaderError (gl, shader, source, type, command) {
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var errLog = gl.getShaderInfoLog(shader);
    var typeName = type === gl.FRAGMENT_SHADER ? 'fragment' : 'vertex';
    checkCommandType(source, 'string', typeName + ' shader source must be a string', command);
    var files = parseSource(source, command);
    var errors = parseErrorLog(errLog);
    annotateFiles(files, errors);

    Object.keys(files).forEach(function (fileNumber) {
      var file = files[fileNumber];
      if (!file.hasErrors) {
        return
      }

      var strings = [''];
      var styles = [''];

      function push (str, style) {
        strings.push(str);
        styles.push(style || '');
      }

      push('file number ' + fileNumber + ': ' + file.name + '\n', 'color:red;text-decoration:underline;font-weight:bold');

      file.lines.forEach(function (line) {
        if (line.errors.length > 0) {
          push(leftPad(line.number, 4) + '|  ', 'background-color:yellow; font-weight:bold');
          push(line.line + endl, 'color:red; background-color:yellow; font-weight:bold');

          // try to guess token
          var offset = 0;
          line.errors.forEach(function (error) {
            var message = error.message;
            var token = /^\s*\'(.*)\'\s*\:\s*(.*)$/.exec(message);
            if (token) {
              var tokenPat = token[1];
              message = token[2];
              switch (tokenPat) {
                case 'assign':
                  tokenPat = '=';
                  break
              }
              offset = Math.max(line.line.indexOf(tokenPat, offset), 0);
            } else {
              offset = 0;
            }

            push(leftPad('| ', 6));
            push(leftPad('^^^', offset + 3) + endl, 'font-weight:bold');
            push(leftPad('| ', 6));
            push(message + endl, 'font-weight:bold');
          });
          push(leftPad('| ', 6) + endl);
        } else {
          push(leftPad(line.number, 4) + '|  ');
          push(line.line + endl, 'color:red');
        }
      });
      if (typeof document !== 'undefined' && !window.chrome) {
        styles[0] = strings.join('%c');
        console.log.apply(console, styles);
      } else {
        console.log(strings.join(''));
      }
    });

    check.raise('Error compiling ' + typeName + ' shader, ' + files[0].name);
  }
}

function checkLinkError (gl, program, fragShader, vertShader, command) {
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var errLog = gl.getProgramInfoLog(program);
    var fragParse = parseSource(fragShader, command);
    var vertParse = parseSource(vertShader, command);

    var header = 'Error linking program with vertex shader, "' +
      vertParse[0].name + '", and fragment shader "' + fragParse[0].name + '"';

    if (typeof document !== 'undefined') {
      console.log('%c' + header + endl + '%c' + errLog,
        'color:red;text-decoration:underline;font-weight:bold',
        'color:red');
    } else {
      console.log(header + endl + errLog);
    }
    check.raise(header);
  }
}

function saveCommandRef (object) {
  object._commandRef = guessCommand();
}

function saveDrawCommandInfo (opts, uniforms, attributes, stringStore) {
  saveCommandRef(opts);

  function id (str) {
    if (str) {
      return stringStore.id(str)
    }
    return 0
  }
  opts._fragId = id(opts.static.frag);
  opts._vertId = id(opts.static.vert);

  function addProps (dict, set) {
    Object.keys(set).forEach(function (u) {
      dict[stringStore.id(u)] = true;
    });
  }

  var uniformSet = opts._uniformSet = {};
  addProps(uniformSet, uniforms.static);
  addProps(uniformSet, uniforms.dynamic);

  var attributeSet = opts._attributeSet = {};
  addProps(attributeSet, attributes.static);
  addProps(attributeSet, attributes.dynamic);

  opts._hasCount = (
    'count' in opts.static ||
    'count' in opts.dynamic ||
    'elements' in opts.static ||
    'elements' in opts.dynamic);
}

function commandRaise (message, command) {
  var callSite = guessCallSite();
  raise(message +
    ' in command ' + (command || guessCommand()) +
    (callSite === 'unknown' ? '' : ' called from ' + callSite));
}

function checkCommand (pred, message, command) {
  if (!pred) {
    commandRaise(message, command || guessCommand());
  }
}

function checkParameterCommand (param, possibilities, message, command) {
  if (!(param in possibilities)) {
    commandRaise(
      'unknown parameter (' + param + ')' + encolon(message) +
      '. possible values: ' + Object.keys(possibilities).join(),
      command || guessCommand());
  }
}

function checkCommandType (value, type, message, command) {
  if (typeof value !== type) {
    commandRaise(
      'invalid parameter type' + encolon(message) +
      '. expected ' + type + ', got ' + (typeof value),
      command || guessCommand());
  }
}

function checkOptional (block) {
  block();
}

function checkFramebufferFormat (attachment, texFormats, rbFormats) {
  if (attachment.texture) {
    checkOneOf(
      attachment.texture._texture.internalformat,
      texFormats,
      'unsupported texture format for attachment');
  } else {
    checkOneOf(
      attachment.renderbuffer._renderbuffer.format,
      rbFormats,
      'unsupported renderbuffer format for attachment');
  }
}

var GL_CLAMP_TO_EDGE = 0x812F;

var GL_NEAREST = 0x2600;
var GL_NEAREST_MIPMAP_NEAREST = 0x2700;
var GL_LINEAR_MIPMAP_NEAREST = 0x2701;
var GL_NEAREST_MIPMAP_LINEAR = 0x2702;
var GL_LINEAR_MIPMAP_LINEAR = 0x2703;

var GL_BYTE = 5120;
var GL_UNSIGNED_BYTE = 5121;
var GL_SHORT = 5122;
var GL_UNSIGNED_SHORT = 5123;
var GL_INT = 5124;
var GL_UNSIGNED_INT = 5125;
var GL_FLOAT = 5126;

var GL_UNSIGNED_SHORT_4_4_4_4 = 0x8033;
var GL_UNSIGNED_SHORT_5_5_5_1 = 0x8034;
var GL_UNSIGNED_SHORT_5_6_5 = 0x8363;
var GL_UNSIGNED_INT_24_8_WEBGL = 0x84FA;

var GL_HALF_FLOAT_OES = 0x8D61;

var TYPE_SIZE = {};

TYPE_SIZE[GL_BYTE] =
TYPE_SIZE[GL_UNSIGNED_BYTE] = 1;

TYPE_SIZE[GL_SHORT] =
TYPE_SIZE[GL_UNSIGNED_SHORT] =
TYPE_SIZE[GL_HALF_FLOAT_OES] =
TYPE_SIZE[GL_UNSIGNED_SHORT_5_6_5] =
TYPE_SIZE[GL_UNSIGNED_SHORT_4_4_4_4] =
TYPE_SIZE[GL_UNSIGNED_SHORT_5_5_5_1] = 2;

TYPE_SIZE[GL_INT] =
TYPE_SIZE[GL_UNSIGNED_INT] =
TYPE_SIZE[GL_FLOAT] =
TYPE_SIZE[GL_UNSIGNED_INT_24_8_WEBGL] = 4;

function pixelSize (type, channels) {
  if (type === GL_UNSIGNED_SHORT_5_5_5_1 ||
      type === GL_UNSIGNED_SHORT_4_4_4_4 ||
      type === GL_UNSIGNED_SHORT_5_6_5) {
    return 2
  } else if (type === GL_UNSIGNED_INT_24_8_WEBGL) {
    return 4
  } else {
    return TYPE_SIZE[type] * channels
  }
}

function isPow2 (v) {
  return !(v & (v - 1)) && (!!v)
}

function checkTexture2D (info, mipData, limits) {
  var i;
  var w = mipData.width;
  var h = mipData.height;
  var c = mipData.channels;

  // Check texture shape
  check(w > 0 && w <= limits.maxTextureSize &&
        h > 0 && h <= limits.maxTextureSize,
        'invalid texture shape');

  // check wrap mode
  if (info.wrapS !== GL_CLAMP_TO_EDGE || info.wrapT !== GL_CLAMP_TO_EDGE) {
    check(isPow2(w) && isPow2(h),
      'incompatible wrap mode for texture, both width and height must be power of 2');
  }

  if (mipData.mipmask === 1) {
    if (w !== 1 && h !== 1) {
      check(
        info.minFilter !== GL_NEAREST_MIPMAP_NEAREST &&
        info.minFilter !== GL_NEAREST_MIPMAP_LINEAR &&
        info.minFilter !== GL_LINEAR_MIPMAP_NEAREST &&
        info.minFilter !== GL_LINEAR_MIPMAP_LINEAR,
        'min filter requires mipmap');
    }
  } else {
    // texture must be power of 2
    check(isPow2(w) && isPow2(h),
      'texture must be a square power of 2 to support mipmapping');
    check(mipData.mipmask === (w << 1) - 1,
      'missing or incomplete mipmap data');
  }

  if (mipData.type === GL_FLOAT) {
    if (limits.extensions.indexOf('oes_texture_float_linear') < 0) {
      check(info.minFilter === GL_NEAREST && info.magFilter === GL_NEAREST,
        'filter not supported, must enable oes_texture_float_linear');
    }
    check(!info.genMipmaps,
      'mipmap generation not supported with float textures');
  }

  // check image complete
  var mipimages = mipData.images;
  for (i = 0; i < 16; ++i) {
    if (mipimages[i]) {
      var mw = w >> i;
      var mh = h >> i;
      check(mipData.mipmask & (1 << i), 'missing mipmap data');

      var img = mipimages[i];

      check(
        img.width === mw &&
        img.height === mh,
        'invalid shape for mip images');

      check(
        img.format === mipData.format &&
        img.internalformat === mipData.internalformat &&
        img.type === mipData.type,
        'incompatible type for mip image');

      if (img.compressed) {
        // TODO: check size for compressed images
      } else if (img.data) {
        // check(img.data.byteLength === mw * mh *
        // Math.max(pixelSize(img.type, c), img.unpackAlignment),
        var rowSize = Math.ceil(pixelSize(img.type, c) * mw / img.unpackAlignment) * img.unpackAlignment;
        check(img.data.byteLength === rowSize * mh,
          'invalid data for image, buffer size is inconsistent with image format');
      } else if (img.element) {
        // TODO: check element can be loaded
      } else if (img.copy) {
        // TODO: check compatible format and type
      }
    } else if (!info.genMipmaps) {
      check((mipData.mipmask & (1 << i)) === 0, 'extra mipmap data');
    }
  }

  if (mipData.compressed) {
    check(!info.genMipmaps,
      'mipmap generation for compressed images not supported');
  }
}

function checkTextureCube (texture, info, faces, limits) {
  var w = texture.width;
  var h = texture.height;
  var c = texture.channels;

  // Check texture shape
  check(
    w > 0 && w <= limits.maxTextureSize && h > 0 && h <= limits.maxTextureSize,
    'invalid texture shape');
  check(
    w === h,
    'cube map must be square');
  check(
    info.wrapS === GL_CLAMP_TO_EDGE && info.wrapT === GL_CLAMP_TO_EDGE,
    'wrap mode not supported by cube map');

  for (var i = 0; i < faces.length; ++i) {
    var face = faces[i];
    check(
      face.width === w && face.height === h,
      'inconsistent cube map face shape');

    if (info.genMipmaps) {
      check(!face.compressed,
        'can not generate mipmap for compressed textures');
      check(face.mipmask === 1,
        'can not specify mipmaps and generate mipmaps');
    } else {
      // TODO: check mip and filter mode
    }

    var mipmaps = face.images;
    for (var j = 0; j < 16; ++j) {
      var img = mipmaps[j];
      if (img) {
        var mw = w >> j;
        var mh = h >> j;
        check(face.mipmask & (1 << j), 'missing mipmap data');
        check(
          img.width === mw &&
          img.height === mh,
          'invalid shape for mip images');
        check(
          img.format === texture.format &&
          img.internalformat === texture.internalformat &&
          img.type === texture.type,
          'incompatible type for mip image');

        if (img.compressed) {
          // TODO: check size for compressed images
        } else if (img.data) {
          check(img.data.byteLength === mw * mh *
            Math.max(pixelSize(img.type, c), img.unpackAlignment),
            'invalid data for image, buffer size is inconsistent with image format');
        } else if (img.element) {
          // TODO: check element can be loaded
        } else if (img.copy) {
          // TODO: check compatible format and type
        }
      }
    }
  }
}

var check$1 = extend(check, {
  optional: checkOptional,
  raise: raise,
  commandRaise: commandRaise,
  command: checkCommand,
  parameter: checkParameter,
  commandParameter: checkParameterCommand,
  constructor: checkConstructor,
  type: checkTypeOf,
  commandType: checkCommandType,
  isTypedArray: checkIsTypedArray,
  nni: checkNonNegativeInt,
  oneOf: checkOneOf,
  shaderError: checkShaderError,
  linkError: checkLinkError,
  callSite: guessCallSite,
  saveCommandRef: saveCommandRef,
  saveDrawInfo: saveDrawCommandInfo,
  framebufferFormat: checkFramebufferFormat,
  guessCommand: guessCommand,
  texture2D: checkTexture2D,
  textureCube: checkTextureCube
});

var VARIABLE_COUNTER = 0;

var DYN_FUNC = 0;

function DynamicVariable (type, data) {
  this.id = (VARIABLE_COUNTER++);
  this.type = type;
  this.data = data;
}

function escapeStr (str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function splitParts (str) {
  if (str.length === 0) {
    return []
  }

  var firstChar = str.charAt(0);
  var lastChar = str.charAt(str.length - 1);

  if (str.length > 1 &&
      firstChar === lastChar &&
      (firstChar === '"' || firstChar === "'")) {
    return ['"' + escapeStr(str.substr(1, str.length - 2)) + '"']
  }

  var parts = /\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(str);
  if (parts) {
    return (
      splitParts(str.substr(0, parts.index))
      .concat(splitParts(parts[1]))
      .concat(splitParts(str.substr(parts.index + parts[0].length)))
    )
  }

  var subparts = str.split('.');
  if (subparts.length === 1) {
    return ['"' + escapeStr(str) + '"']
  }

  var result = [];
  for (var i = 0; i < subparts.length; ++i) {
    result = result.concat(splitParts(subparts[i]));
  }
  return result
}

function toAccessorString (str) {
  return '[' + splitParts(str).join('][') + ']'
}

function defineDynamic (type, data) {
  return new DynamicVariable(type, toAccessorString(data + ''))
}

function isDynamic (x) {
  return (typeof x === 'function' && !x._reglType) ||
         x instanceof DynamicVariable
}

function unbox (x, path) {
  if (typeof x === 'function') {
    return new DynamicVariable(DYN_FUNC, x)
  }
  return x
}

var dynamic = {
  DynamicVariable: DynamicVariable,
  define: defineDynamic,
  isDynamic: isDynamic,
  unbox: unbox,
  accessor: toAccessorString
};

/* globals requestAnimationFrame, cancelAnimationFrame */
var raf = {
  next: typeof requestAnimationFrame === 'function'
    ? function (cb) { return requestAnimationFrame(cb) }
    : function (cb) { return setTimeout(cb, 16) },
  cancel: typeof cancelAnimationFrame === 'function'
    ? function (raf) { return cancelAnimationFrame(raf) }
    : clearTimeout
};

/* globals performance */
var clock = (typeof performance !== 'undefined' && performance.now)
  ? function () { return performance.now() }
  : function () { return +(new Date()) };

function createStringStore () {
  var stringIds = {'': 0};
  var stringValues = [''];
  return {
    id: function (str) {
      var result = stringIds[str];
      if (result) {
        return result
      }
      result = stringIds[str] = stringValues.length;
      stringValues.push(str);
      return result
    },

    str: function (id) {
      return stringValues[id]
    }
  }
}

// Context and canvas creation helper functions
function createCanvas (element, onDone, pixelRatio) {
  var canvas = document.createElement('canvas');
  extend(canvas.style, {
    border: 0,
    margin: 0,
    padding: 0,
    top: 0,
    left: 0
  });
  element.appendChild(canvas);

  if (element === document.body) {
    canvas.style.position = 'absolute';
    extend(element.style, {
      margin: 0,
      padding: 0
    });
  }

  function resize () {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (element !== document.body) {
      var bounds = element.getBoundingClientRect();
      w = bounds.right - bounds.left;
      h = bounds.bottom - bounds.top;
    }
    canvas.width = pixelRatio * w;
    canvas.height = pixelRatio * h;
    extend(canvas.style, {
      width: w + 'px',
      height: h + 'px'
    });
  }

  window.addEventListener('resize', resize, false);

  function onDestroy () {
    window.removeEventListener('resize', resize);
    element.removeChild(canvas);
  }

  resize();

  return {
    canvas: canvas,
    onDestroy: onDestroy
  }
}

function createContext (canvas, contextAttributes) {
  function get (name) {
    try {
      return canvas.getContext(name, contextAttributes)
    } catch (e) {
      return null
    }
  }
  return (
    get('webgl') ||
    get('experimental-webgl') ||
    get('webgl-experimental')
  )
}

function isHTMLElement (obj) {
  return (
    typeof obj.nodeName === 'string' &&
    typeof obj.appendChild === 'function' &&
    typeof obj.getBoundingClientRect === 'function'
  )
}

function isWebGLContext (obj) {
  return (
    typeof obj.drawArrays === 'function' ||
    typeof obj.drawElements === 'function'
  )
}

function parseExtensions (input) {
  if (typeof input === 'string') {
    return input.split()
  }
  check$1(Array.isArray(input), 'invalid extension array');
  return input
}

function getElement (desc) {
  if (typeof desc === 'string') {
    check$1(typeof document !== 'undefined', 'not supported outside of DOM');
    return document.querySelector(desc)
  }
  return desc
}

function parseArgs (args_) {
  var args = args_ || {};
  var element, container, canvas, gl;
  var contextAttributes = {};
  var extensions = [];
  var optionalExtensions = [];
  var pixelRatio = (typeof window === 'undefined' ? 1 : window.devicePixelRatio);
  var profile = false;
  var onDone = function (err) {
    if (err) {
      check$1.raise(err);
    }
  };
  var onDestroy = function () {};
  if (typeof args === 'string') {
    check$1(
      typeof document !== 'undefined',
      'selector queries only supported in DOM enviroments');
    element = document.querySelector(args);
    check$1(element, 'invalid query string for element');
  } else if (typeof args === 'object') {
    if (isHTMLElement(args)) {
      element = args;
    } else if (isWebGLContext(args)) {
      gl = args;
      canvas = gl.canvas;
    } else {
      check$1.constructor(args);
      if ('gl' in args) {
        gl = args.gl;
      } else if ('canvas' in args) {
        canvas = getElement(args.canvas);
      } else if ('container' in args) {
        container = getElement(args.container);
      }
      if ('attributes' in args) {
        contextAttributes = args.attributes;
        check$1.type(contextAttributes, 'object', 'invalid context attributes');
      }
      if ('extensions' in args) {
        extensions = parseExtensions(args.extensions);
      }
      if ('optionalExtensions' in args) {
        optionalExtensions = parseExtensions(args.optionalExtensions);
      }
      if ('onDone' in args) {
        check$1.type(
          args.onDone, 'function',
          'invalid or missing onDone callback');
        onDone = args.onDone;
      }
      if ('profile' in args) {
        profile = !!args.profile;
      }
      if ('pixelRatio' in args) {
        pixelRatio = +args.pixelRatio;
        check$1(pixelRatio > 0, 'invalid pixel ratio');
      }
    }
  } else {
    check$1.raise('invalid arguments to regl');
  }

  if (element) {
    if (element.nodeName.toLowerCase() === 'canvas') {
      canvas = element;
    } else {
      container = element;
    }
  }

  if (!gl) {
    if (!canvas) {
      check$1(
        typeof document !== 'undefined',
        'must manually specify webgl context outside of DOM environments');
      var result = createCanvas(container || document.body, onDone, pixelRatio);
      if (!result) {
        return null
      }
      canvas = result.canvas;
      onDestroy = result.onDestroy;
    }
    gl = createContext(canvas, contextAttributes);
  }

  if (!gl) {
    onDestroy();
    onDone('webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org');
    return null
  }

  return {
    gl: gl,
    canvas: canvas,
    container: container,
    extensions: extensions,
    optionalExtensions: optionalExtensions,
    pixelRatio: pixelRatio,
    profile: profile,
    onDone: onDone,
    onDestroy: onDestroy
  }
}

function createExtensionCache (gl, config) {
  var extensions = {};

  function tryLoadExtension (name_) {
    check$1.type(name_, 'string', 'extension name must be string');
    var name = name_.toLowerCase();
    var ext;
    try {
      ext = extensions[name] = gl.getExtension(name);
    } catch (e) {}
    return !!ext
  }

  for (var i = 0; i < config.extensions.length; ++i) {
    var name = config.extensions[i];
    if (!tryLoadExtension(name)) {
      config.onDestroy();
      config.onDone('"' + name + '" extension is not supported by the current WebGL context, try upgrading your system or a different browser');
      return null
    }
  }

  config.optionalExtensions.forEach(tryLoadExtension);

  return {
    extensions: extensions,
    restore: function () {
      Object.keys(extensions).forEach(function (name) {
        if (!tryLoadExtension(name)) {
          throw new Error('(regl): error restoring extension ' + name)
        }
      });
    }
  }
}

function loop (n, f) {
  var result = Array(n);
  for (var i = 0; i < n; ++i) {
    result[i] = f(i);
  }
  return result
}

var GL_BYTE$1 = 5120;
var GL_UNSIGNED_BYTE$2 = 5121;
var GL_SHORT$1 = 5122;
var GL_UNSIGNED_SHORT$1 = 5123;
var GL_INT$1 = 5124;
var GL_UNSIGNED_INT$1 = 5125;
var GL_FLOAT$2 = 5126;

function nextPow16 (v) {
  for (var i = 16; i <= (1 << 28); i *= 16) {
    if (v <= i) {
      return i
    }
  }
  return 0
}

function log2 (v) {
  var r, shift;
  r = (v > 0xFFFF) << 4;
  v >>>= r;
  shift = (v > 0xFF) << 3;
  v >>>= shift; r |= shift;
  shift = (v > 0xF) << 2;
  v >>>= shift; r |= shift;
  shift = (v > 0x3) << 1;
  v >>>= shift; r |= shift;
  return r | (v >> 1)
}

function createPool () {
  var bufferPool = loop(8, function () {
    return []
  });

  function alloc (n) {
    var sz = nextPow16(n);
    var bin = bufferPool[log2(sz) >> 2];
    if (bin.length > 0) {
      return bin.pop()
    }
    return new ArrayBuffer(sz)
  }

  function free (buf) {
    bufferPool[log2(buf.byteLength) >> 2].push(buf);
  }

  function allocType (type, n) {
    var result = null;
    switch (type) {
      case GL_BYTE$1:
        result = new Int8Array(alloc(n), 0, n);
        break
      case GL_UNSIGNED_BYTE$2:
        result = new Uint8Array(alloc(n), 0, n);
        break
      case GL_SHORT$1:
        result = new Int16Array(alloc(2 * n), 0, n);
        break
      case GL_UNSIGNED_SHORT$1:
        result = new Uint16Array(alloc(2 * n), 0, n);
        break
      case GL_INT$1:
        result = new Int32Array(alloc(4 * n), 0, n);
        break
      case GL_UNSIGNED_INT$1:
        result = new Uint32Array(alloc(4 * n), 0, n);
        break
      case GL_FLOAT$2:
        result = new Float32Array(alloc(4 * n), 0, n);
        break
      default:
        return null
    }
    if (result.length !== n) {
      return result.subarray(0, n)
    }
    return result
  }

  function freeType (array) {
    free(array.buffer);
  }

  return {
    alloc: alloc,
    free: free,
    allocType: allocType,
    freeType: freeType
  }
}

var pool = createPool();

// zero pool for initial zero data
pool.zero = createPool();

var GL_SUBPIXEL_BITS = 0x0D50;
var GL_RED_BITS = 0x0D52;
var GL_GREEN_BITS = 0x0D53;
var GL_BLUE_BITS = 0x0D54;
var GL_ALPHA_BITS = 0x0D55;
var GL_DEPTH_BITS = 0x0D56;
var GL_STENCIL_BITS = 0x0D57;

var GL_ALIASED_POINT_SIZE_RANGE = 0x846D;
var GL_ALIASED_LINE_WIDTH_RANGE = 0x846E;

var GL_MAX_TEXTURE_SIZE = 0x0D33;
var GL_MAX_VIEWPORT_DIMS = 0x0D3A;
var GL_MAX_VERTEX_ATTRIBS = 0x8869;
var GL_MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
var GL_MAX_VARYING_VECTORS = 0x8DFC;
var GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
var GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8B4C;
var GL_MAX_TEXTURE_IMAGE_UNITS = 0x8872;
var GL_MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
var GL_MAX_CUBE_MAP_TEXTURE_SIZE = 0x851C;
var GL_MAX_RENDERBUFFER_SIZE = 0x84E8;

var GL_VENDOR = 0x1F00;
var GL_RENDERER = 0x1F01;
var GL_VERSION = 0x1F02;
var GL_SHADING_LANGUAGE_VERSION = 0x8B8C;

var GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF;

var GL_MAX_COLOR_ATTACHMENTS_WEBGL = 0x8CDF;
var GL_MAX_DRAW_BUFFERS_WEBGL = 0x8824;

var GL_TEXTURE_2D = 0x0DE1;
var GL_TEXTURE_CUBE_MAP = 0x8513;
var GL_TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
var GL_TEXTURE0 = 0x84C0;
var GL_RGBA = 0x1908;
var GL_FLOAT$1 = 0x1406;
var GL_UNSIGNED_BYTE$1 = 0x1401;
var GL_FRAMEBUFFER = 0x8D40;
var GL_FRAMEBUFFER_COMPLETE = 0x8CD5;
var GL_COLOR_ATTACHMENT0 = 0x8CE0;
var GL_COLOR_BUFFER_BIT$1 = 0x4000;

var wrapLimits = function (gl, extensions) {
  var maxAnisotropic = 1;
  if (extensions.ext_texture_filter_anisotropic) {
    maxAnisotropic = gl.getParameter(GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  }

  var maxDrawbuffers = 1;
  var maxColorAttachments = 1;
  if (extensions.webgl_draw_buffers) {
    maxDrawbuffers = gl.getParameter(GL_MAX_DRAW_BUFFERS_WEBGL);
    maxColorAttachments = gl.getParameter(GL_MAX_COLOR_ATTACHMENTS_WEBGL);
  }

  // detect if reading float textures is available (Safari doesn't support)
  var readFloat = !!extensions.oes_texture_float;
  if (readFloat) {
    var readFloatTexture = gl.createTexture();
    gl.bindTexture(GL_TEXTURE_2D, readFloatTexture);
    gl.texImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 1, 1, 0, GL_RGBA, GL_FLOAT$1, null);

    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(GL_FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, readFloatTexture, 0);
    gl.bindTexture(GL_TEXTURE_2D, null);

    if (gl.checkFramebufferStatus(GL_FRAMEBUFFER) !== GL_FRAMEBUFFER_COMPLETE) readFloat = false;

    else {
      gl.viewport(0, 0, 1, 1);
      gl.clearColor(1.0, 0.0, 0.0, 1.0);
      gl.clear(GL_COLOR_BUFFER_BIT$1);
      var pixels = pool.allocType(GL_FLOAT$1, 4);
      gl.readPixels(0, 0, 1, 1, GL_RGBA, GL_FLOAT$1, pixels);

      if (gl.getError()) readFloat = false;
      else {
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(readFloatTexture);

        readFloat = pixels[0] === 1.0;
      }

      pool.freeType(pixels);
    }
  }

  // detect non power of two cube textures support (IE doesn't support)
  var npotTextureCube = true;
  var cubeTexture = gl.createTexture();
  var data = pool.allocType(GL_UNSIGNED_BYTE$1, 36);
  gl.activeTexture(GL_TEXTURE0);
  gl.bindTexture(GL_TEXTURE_CUBE_MAP, cubeTexture);
  gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X, 0, GL_RGBA, 3, 3, 0, GL_RGBA, GL_UNSIGNED_BYTE$1, data);
  pool.freeType(data);
  gl.bindTexture(GL_TEXTURE_CUBE_MAP, null);
  gl.deleteTexture(cubeTexture);
  npotTextureCube = !gl.getError();

  return {
    // drawing buffer bit depth
    colorBits: [
      gl.getParameter(GL_RED_BITS),
      gl.getParameter(GL_GREEN_BITS),
      gl.getParameter(GL_BLUE_BITS),
      gl.getParameter(GL_ALPHA_BITS)
    ],
    depthBits: gl.getParameter(GL_DEPTH_BITS),
    stencilBits: gl.getParameter(GL_STENCIL_BITS),
    subpixelBits: gl.getParameter(GL_SUBPIXEL_BITS),

    // supported extensions
    extensions: Object.keys(extensions).filter(function (ext) {
      return !!extensions[ext]
    }),

    // max aniso samples
    maxAnisotropic: maxAnisotropic,

    // max draw buffers
    maxDrawbuffers: maxDrawbuffers,
    maxColorAttachments: maxColorAttachments,

    // point and line size ranges
    pointSizeDims: gl.getParameter(GL_ALIASED_POINT_SIZE_RANGE),
    lineWidthDims: gl.getParameter(GL_ALIASED_LINE_WIDTH_RANGE),
    maxViewportDims: gl.getParameter(GL_MAX_VIEWPORT_DIMS),
    maxCombinedTextureUnits: gl.getParameter(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    maxCubeMapSize: gl.getParameter(GL_MAX_CUBE_MAP_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(GL_MAX_RENDERBUFFER_SIZE),
    maxTextureUnits: gl.getParameter(GL_MAX_TEXTURE_IMAGE_UNITS),
    maxTextureSize: gl.getParameter(GL_MAX_TEXTURE_SIZE),
    maxAttributes: gl.getParameter(GL_MAX_VERTEX_ATTRIBS),
    maxVertexUniforms: gl.getParameter(GL_MAX_VERTEX_UNIFORM_VECTORS),
    maxVertexTextureUnits: gl.getParameter(GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    maxVaryingVectors: gl.getParameter(GL_MAX_VARYING_VECTORS),
    maxFragmentUniforms: gl.getParameter(GL_MAX_FRAGMENT_UNIFORM_VECTORS),

    // vendor info
    glsl: gl.getParameter(GL_SHADING_LANGUAGE_VERSION),
    renderer: gl.getParameter(GL_RENDERER),
    vendor: gl.getParameter(GL_VENDOR),
    version: gl.getParameter(GL_VERSION),

    // quirks
    readFloat: readFloat,
    npotTextureCube: npotTextureCube
  }
};

function isNDArrayLike (obj) {
  return (
    !!obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.shape) &&
    Array.isArray(obj.stride) &&
    typeof obj.offset === 'number' &&
    obj.shape.length === obj.stride.length &&
    (Array.isArray(obj.data) ||
      isTypedArray(obj.data)))
}

var values = function (obj) {
  return Object.keys(obj).map(function (key) { return obj[key] })
};

var flattenUtils = {
  shape: arrayShape$1,
  flatten: flattenArray
};

function flatten1D (array, nx, out) {
  for (var i = 0; i < nx; ++i) {
    out[i] = array[i];
  }
}

function flatten2D (array, nx, ny, out) {
  var ptr = 0;
  for (var i = 0; i < nx; ++i) {
    var row = array[i];
    for (var j = 0; j < ny; ++j) {
      out[ptr++] = row[j];
    }
  }
}

function flatten3D (array, nx, ny, nz, out, ptr_) {
  var ptr = ptr_;
  for (var i = 0; i < nx; ++i) {
    var row = array[i];
    for (var j = 0; j < ny; ++j) {
      var col = row[j];
      for (var k = 0; k < nz; ++k) {
        out[ptr++] = col[k];
      }
    }
  }
}

function flattenRec (array, shape, level, out, ptr) {
  var stride = 1;
  for (var i = level + 1; i < shape.length; ++i) {
    stride *= shape[i];
  }
  var n = shape[level];
  if (shape.length - level === 4) {
    var nx = shape[level + 1];
    var ny = shape[level + 2];
    var nz = shape[level + 3];
    for (i = 0; i < n; ++i) {
      flatten3D(array[i], nx, ny, nz, out, ptr);
      ptr += stride;
    }
  } else {
    for (i = 0; i < n; ++i) {
      flattenRec(array[i], shape, level + 1, out, ptr);
      ptr += stride;
    }
  }
}

function flattenArray (array, shape, type, out_) {
  var sz = 1;
  if (shape.length) {
    for (var i = 0; i < shape.length; ++i) {
      sz *= shape[i];
    }
  } else {
    sz = 0;
  }
  var out = out_ || pool.allocType(type, sz);
  switch (shape.length) {
    case 0:
      break
    case 1:
      flatten1D(array, shape[0], out);
      break
    case 2:
      flatten2D(array, shape[0], shape[1], out);
      break
    case 3:
      flatten3D(array, shape[0], shape[1], shape[2], out, 0);
      break
    default:
      flattenRec(array, shape, 0, out, 0);
  }
  return out
}

function arrayShape$1 (array_) {
  var shape = [];
  for (var array = array_; array.length; array = array[0]) {
    shape.push(array.length);
  }
  return shape
}

var arrayTypes = {
	"[object Int8Array]": 5120,
	"[object Int16Array]": 5122,
	"[object Int32Array]": 5124,
	"[object Uint8Array]": 5121,
	"[object Uint8ClampedArray]": 5121,
	"[object Uint16Array]": 5123,
	"[object Uint32Array]": 5125,
	"[object Float32Array]": 5126,
	"[object Float64Array]": 5121,
	"[object ArrayBuffer]": 5121
};

var int8 = 5120;
var int16 = 5122;
var int32 = 5124;
var uint8 = 5121;
var uint16 = 5123;
var uint32 = 5125;
var float = 5126;
var float32 = 5126;
var glTypes = {
	int8: int8,
	int16: int16,
	int32: int32,
	uint8: uint8,
	uint16: uint16,
	uint32: uint32,
	float: float,
	float32: float32
};

var dynamic$1 = 35048;
var stream = 35040;
var usageTypes = {
	dynamic: dynamic$1,
	stream: stream,
	"static": 35044
};

var arrayFlatten = flattenUtils.flatten;
var arrayShape = flattenUtils.shape;

var GL_STATIC_DRAW = 0x88E4;
var GL_STREAM_DRAW = 0x88E0;

var GL_UNSIGNED_BYTE$3 = 5121;
var GL_FLOAT$3 = 5126;

var DTYPES_SIZES = [];
DTYPES_SIZES[5120] = 1; // int8
DTYPES_SIZES[5122] = 2; // int16
DTYPES_SIZES[5124] = 4; // int32
DTYPES_SIZES[5121] = 1; // uint8
DTYPES_SIZES[5123] = 2; // uint16
DTYPES_SIZES[5125] = 4; // uint32
DTYPES_SIZES[5126] = 4; // float32

function typedArrayCode (data) {
  return arrayTypes[Object.prototype.toString.call(data)] | 0
}

function copyArray (out, inp) {
  for (var i = 0; i < inp.length; ++i) {
    out[i] = inp[i];
  }
}

function transpose (
  result, data, shapeX, shapeY, strideX, strideY, offset) {
  var ptr = 0;
  for (var i = 0; i < shapeX; ++i) {
    for (var j = 0; j < shapeY; ++j) {
      result[ptr++] = data[strideX * i + strideY * j + offset];
    }
  }
}

function wrapBufferState (gl, stats, config, attributeState) {
  var bufferCount = 0;
  var bufferSet = {};

  function REGLBuffer (type) {
    this.id = bufferCount++;
    this.buffer = gl.createBuffer();
    this.type = type;
    this.usage = GL_STATIC_DRAW;
    this.byteLength = 0;
    this.dimension = 1;
    this.dtype = GL_UNSIGNED_BYTE$3;

    this.persistentData = null;

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  REGLBuffer.prototype.bind = function () {
    gl.bindBuffer(this.type, this.buffer);
  };

  REGLBuffer.prototype.destroy = function () {
    destroy(this);
  };

  var streamPool = [];

  function createStream (type, data) {
    var buffer = streamPool.pop();
    if (!buffer) {
      buffer = new REGLBuffer(type);
    }
    buffer.bind();
    initBufferFromData(buffer, data, GL_STREAM_DRAW, 0, 1, false);
    return buffer
  }

  function destroyStream (stream$$1) {
    streamPool.push(stream$$1);
  }

  function initBufferFromTypedArray (buffer, data, usage) {
    buffer.byteLength = data.byteLength;
    gl.bufferData(buffer.type, data, usage);
  }

  function initBufferFromData (buffer, data, usage, dtype, dimension, persist) {
    var shape;
    buffer.usage = usage;
    if (Array.isArray(data)) {
      buffer.dtype = dtype || GL_FLOAT$3;
      if (data.length > 0) {
        var flatData;
        if (Array.isArray(data[0])) {
          shape = arrayShape(data);
          var dim = 1;
          for (var i = 1; i < shape.length; ++i) {
            dim *= shape[i];
          }
          buffer.dimension = dim;
          flatData = arrayFlatten(data, shape, buffer.dtype);
          initBufferFromTypedArray(buffer, flatData, usage);
          if (persist) {
            buffer.persistentData = flatData;
          } else {
            pool.freeType(flatData);
          }
        } else if (typeof data[0] === 'number') {
          buffer.dimension = dimension;
          var typedData = pool.allocType(buffer.dtype, data.length);
          copyArray(typedData, data);
          initBufferFromTypedArray(buffer, typedData, usage);
          if (persist) {
            buffer.persistentData = typedData;
          } else {
            pool.freeType(typedData);
          }
        } else if (isTypedArray(data[0])) {
          buffer.dimension = data[0].length;
          buffer.dtype = dtype || typedArrayCode(data[0]) || GL_FLOAT$3;
          flatData = arrayFlatten(
            data,
            [data.length, data[0].length],
            buffer.dtype);
          initBufferFromTypedArray(buffer, flatData, usage);
          if (persist) {
            buffer.persistentData = flatData;
          } else {
            pool.freeType(flatData);
          }
        } else {
          check$1.raise('invalid buffer data');
        }
      }
    } else if (isTypedArray(data)) {
      buffer.dtype = dtype || typedArrayCode(data);
      buffer.dimension = dimension;
      initBufferFromTypedArray(buffer, data, usage);
      if (persist) {
        buffer.persistentData = new Uint8Array(new Uint8Array(data.buffer));
      }
    } else if (isNDArrayLike(data)) {
      shape = data.shape;
      var stride = data.stride;
      var offset = data.offset;

      var shapeX = 0;
      var shapeY = 0;
      var strideX = 0;
      var strideY = 0;
      if (shape.length === 1) {
        shapeX = shape[0];
        shapeY = 1;
        strideX = stride[0];
        strideY = 0;
      } else if (shape.length === 2) {
        shapeX = shape[0];
        shapeY = shape[1];
        strideX = stride[0];
        strideY = stride[1];
      } else {
        check$1.raise('invalid shape');
      }

      buffer.dtype = dtype || typedArrayCode(data.data) || GL_FLOAT$3;
      buffer.dimension = shapeY;

      var transposeData = pool.allocType(buffer.dtype, shapeX * shapeY);
      transpose(transposeData,
        data.data,
        shapeX, shapeY,
        strideX, strideY,
        offset);
      initBufferFromTypedArray(buffer, transposeData, usage);
      if (persist) {
        buffer.persistentData = transposeData;
      } else {
        pool.freeType(transposeData);
      }
    } else {
      check$1.raise('invalid buffer data');
    }
  }

  function destroy (buffer) {
    stats.bufferCount--;

    for (var i = 0; i < attributeState.state.length; ++i) {
      var record = attributeState.state[i];
      if (record.buffer === buffer) {
        gl.disableVertexAttribArray(i);
        record.buffer = null;
      }
    }

    var handle = buffer.buffer;
    check$1(handle, 'buffer must not be deleted already');
    gl.deleteBuffer(handle);
    buffer.buffer = null;
    delete bufferSet[buffer.id];
  }

  function createBuffer (options, type, deferInit, persistent) {
    stats.bufferCount++;

    var buffer = new REGLBuffer(type);
    bufferSet[buffer.id] = buffer;

    function reglBuffer (options) {
      var usage = GL_STATIC_DRAW;
      var data = null;
      var byteLength = 0;
      var dtype = 0;
      var dimension = 1;
      if (Array.isArray(options) ||
          isTypedArray(options) ||
          isNDArrayLike(options)) {
        data = options;
      } else if (typeof options === 'number') {
        byteLength = options | 0;
      } else if (options) {
        check$1.type(
          options, 'object',
          'buffer arguments must be an object, a number or an array');

        if ('data' in options) {
          check$1(
            data === null ||
            Array.isArray(data) ||
            isTypedArray(data) ||
            isNDArrayLike(data),
            'invalid data for buffer');
          data = options.data;
        }

        if ('usage' in options) {
          check$1.parameter(options.usage, usageTypes, 'invalid buffer usage');
          usage = usageTypes[options.usage];
        }

        if ('type' in options) {
          check$1.parameter(options.type, glTypes, 'invalid buffer type');
          dtype = glTypes[options.type];
        }

        if ('dimension' in options) {
          check$1.type(options.dimension, 'number', 'invalid dimension');
          dimension = options.dimension | 0;
        }

        if ('length' in options) {
          check$1.nni(byteLength, 'buffer length must be a nonnegative integer');
          byteLength = options.length | 0;
        }
      }

      buffer.bind();
      if (!data) {
        // #475
        if (byteLength) gl.bufferData(buffer.type, byteLength, usage);
        buffer.dtype = dtype || GL_UNSIGNED_BYTE$3;
        buffer.usage = usage;
        buffer.dimension = dimension;
        buffer.byteLength = byteLength;
      } else {
        initBufferFromData(buffer, data, usage, dtype, dimension, persistent);
      }

      if (config.profile) {
        buffer.stats.size = buffer.byteLength * DTYPES_SIZES[buffer.dtype];
      }

      return reglBuffer
    }

    function setSubData (data, offset) {
      check$1(offset + data.byteLength <= buffer.byteLength,
        'invalid buffer subdata call, buffer is too small. ' + ' Can\'t write data of size ' + data.byteLength + ' starting from offset ' + offset + ' to a buffer of size ' + buffer.byteLength);

      gl.bufferSubData(buffer.type, offset, data);
    }

    function subdata (data, offset_) {
      var offset = (offset_ || 0) | 0;
      var shape;
      buffer.bind();
      if (isTypedArray(data)) {
        setSubData(data, offset);
      } else if (Array.isArray(data)) {
        if (data.length > 0) {
          if (typeof data[0] === 'number') {
            var converted = pool.allocType(buffer.dtype, data.length);
            copyArray(converted, data);
            setSubData(converted, offset);
            pool.freeType(converted);
          } else if (Array.isArray(data[0]) || isTypedArray(data[0])) {
            shape = arrayShape(data);
            var flatData = arrayFlatten(data, shape, buffer.dtype);
            setSubData(flatData, offset);
            pool.freeType(flatData);
          } else {
            check$1.raise('invalid buffer data');
          }
        }
      } else if (isNDArrayLike(data)) {
        shape = data.shape;
        var stride = data.stride;

        var shapeX = 0;
        var shapeY = 0;
        var strideX = 0;
        var strideY = 0;
        if (shape.length === 1) {
          shapeX = shape[0];
          shapeY = 1;
          strideX = stride[0];
          strideY = 0;
        } else if (shape.length === 2) {
          shapeX = shape[0];
          shapeY = shape[1];
          strideX = stride[0];
          strideY = stride[1];
        } else {
          check$1.raise('invalid shape');
        }
        var dtype = Array.isArray(data.data)
          ? buffer.dtype
          : typedArrayCode(data.data);

        var transposeData = pool.allocType(dtype, shapeX * shapeY);
        transpose(transposeData,
          data.data,
          shapeX, shapeY,
          strideX, strideY,
          data.offset);
        setSubData(transposeData, offset);
        pool.freeType(transposeData);
      } else {
        check$1.raise('invalid data for buffer subdata');
      }
      return reglBuffer
    }

    if (!deferInit) {
      reglBuffer(options);
    }

    reglBuffer._reglType = 'buffer';
    reglBuffer._buffer = buffer;
    reglBuffer.subdata = subdata;
    if (config.profile) {
      reglBuffer.stats = buffer.stats;
    }
    reglBuffer.destroy = function () { destroy(buffer); };

    return reglBuffer
  }

  function restoreBuffers () {
    values(bufferSet).forEach(function (buffer) {
      buffer.buffer = gl.createBuffer();
      gl.bindBuffer(buffer.type, buffer.buffer);
      gl.bufferData(
        buffer.type, buffer.persistentData || buffer.byteLength, buffer.usage);
    });
  }

  if (config.profile) {
    stats.getTotalBufferSize = function () {
      var total = 0;
      // TODO: Right now, the streams are not part of the total count.
      Object.keys(bufferSet).forEach(function (key) {
        total += bufferSet[key].stats.size;
      });
      return total
    };
  }

  return {
    create: createBuffer,

    createStream: createStream,
    destroyStream: destroyStream,

    clear: function () {
      values(bufferSet).forEach(destroy);
      streamPool.forEach(destroy);
    },

    getBuffer: function (wrapper) {
      if (wrapper && wrapper._buffer instanceof REGLBuffer) {
        return wrapper._buffer
      }
      return null
    },

    restore: restoreBuffers,

    _initBuffer: initBufferFromData
  }
}

var points = 0;
var point = 0;
var lines = 1;
var line = 1;
var triangles = 4;
var triangle = 4;
var primTypes = {
	points: points,
	point: point,
	lines: lines,
	line: line,
	triangles: triangles,
	triangle: triangle,
	"line loop": 2,
	"line strip": 3,
	"triangle strip": 5,
	"triangle fan": 6
};

var GL_POINTS = 0;
var GL_LINES = 1;
var GL_TRIANGLES = 4;

var GL_BYTE$2 = 5120;
var GL_UNSIGNED_BYTE$4 = 5121;
var GL_SHORT$2 = 5122;
var GL_UNSIGNED_SHORT$2 = 5123;
var GL_INT$2 = 5124;
var GL_UNSIGNED_INT$2 = 5125;

var GL_ELEMENT_ARRAY_BUFFER = 34963;

var GL_STREAM_DRAW$1 = 0x88E0;
var GL_STATIC_DRAW$1 = 0x88E4;

function wrapElementsState (gl, extensions, bufferState, stats) {
  var elementSet = {};
  var elementCount = 0;

  var elementTypes = {
    'uint8': GL_UNSIGNED_BYTE$4,
    'uint16': GL_UNSIGNED_SHORT$2
  };

  if (extensions.oes_element_index_uint) {
    elementTypes.uint32 = GL_UNSIGNED_INT$2;
  }

  function REGLElementBuffer (buffer) {
    this.id = elementCount++;
    elementSet[this.id] = this;
    this.buffer = buffer;
    this.primType = GL_TRIANGLES;
    this.vertCount = 0;
    this.type = 0;
  }

  REGLElementBuffer.prototype.bind = function () {
    this.buffer.bind();
  };

  var bufferPool = [];

  function createElementStream (data) {
    var result = bufferPool.pop();
    if (!result) {
      result = new REGLElementBuffer(bufferState.create(
        null,
        GL_ELEMENT_ARRAY_BUFFER,
        true,
        false)._buffer);
    }
    initElements(result, data, GL_STREAM_DRAW$1, -1, -1, 0, 0);
    return result
  }

  function destroyElementStream (elements) {
    bufferPool.push(elements);
  }

  function initElements (
    elements,
    data,
    usage,
    prim,
    count,
    byteLength,
    type) {
    elements.buffer.bind();
    if (data) {
      var predictedType = type;
      if (!type && (
          !isTypedArray(data) ||
         (isNDArrayLike(data) && !isTypedArray(data.data)))) {
        predictedType = extensions.oes_element_index_uint
          ? GL_UNSIGNED_INT$2
          : GL_UNSIGNED_SHORT$2;
      }
      bufferState._initBuffer(
        elements.buffer,
        data,
        usage,
        predictedType,
        3);
    } else {
      gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, byteLength, usage);
      elements.buffer.dtype = dtype || GL_UNSIGNED_BYTE$4;
      elements.buffer.usage = usage;
      elements.buffer.dimension = 3;
      elements.buffer.byteLength = byteLength;
    }

    var dtype = type;
    if (!type) {
      switch (elements.buffer.dtype) {
        case GL_UNSIGNED_BYTE$4:
        case GL_BYTE$2:
          dtype = GL_UNSIGNED_BYTE$4;
          break

        case GL_UNSIGNED_SHORT$2:
        case GL_SHORT$2:
          dtype = GL_UNSIGNED_SHORT$2;
          break

        case GL_UNSIGNED_INT$2:
        case GL_INT$2:
          dtype = GL_UNSIGNED_INT$2;
          break

        default:
          check$1.raise('unsupported type for element array');
      }
      elements.buffer.dtype = dtype;
    }
    elements.type = dtype;

    // Check oes_element_index_uint extension
    check$1(
      dtype !== GL_UNSIGNED_INT$2 ||
      !!extensions.oes_element_index_uint,
      '32 bit element buffers not supported, enable oes_element_index_uint first');

    // try to guess default primitive type and arguments
    var vertCount = count;
    if (vertCount < 0) {
      vertCount = elements.buffer.byteLength;
      if (dtype === GL_UNSIGNED_SHORT$2) {
        vertCount >>= 1;
      } else if (dtype === GL_UNSIGNED_INT$2) {
        vertCount >>= 2;
      }
    }
    elements.vertCount = vertCount;

    // try to guess primitive type from cell dimension
    var primType = prim;
    if (prim < 0) {
      primType = GL_TRIANGLES;
      var dimension = elements.buffer.dimension;
      if (dimension === 1) primType = GL_POINTS;
      if (dimension === 2) primType = GL_LINES;
      if (dimension === 3) primType = GL_TRIANGLES;
    }
    elements.primType = primType;
  }

  function destroyElements (elements) {
    stats.elementsCount--;

    check$1(elements.buffer !== null, 'must not double destroy elements');
    delete elementSet[elements.id];
    elements.buffer.destroy();
    elements.buffer = null;
  }

  function createElements (options, persistent) {
    var buffer = bufferState.create(null, GL_ELEMENT_ARRAY_BUFFER, true);
    var elements = new REGLElementBuffer(buffer._buffer);
    stats.elementsCount++;

    function reglElements (options) {
      if (!options) {
        buffer();
        elements.primType = GL_TRIANGLES;
        elements.vertCount = 0;
        elements.type = GL_UNSIGNED_BYTE$4;
      } else if (typeof options === 'number') {
        buffer(options);
        elements.primType = GL_TRIANGLES;
        elements.vertCount = options | 0;
        elements.type = GL_UNSIGNED_BYTE$4;
      } else {
        var data = null;
        var usage = GL_STATIC_DRAW$1;
        var primType = -1;
        var vertCount = -1;
        var byteLength = 0;
        var dtype = 0;
        if (Array.isArray(options) ||
            isTypedArray(options) ||
            isNDArrayLike(options)) {
          data = options;
        } else {
          check$1.type(options, 'object', 'invalid arguments for elements');
          if ('data' in options) {
            data = options.data;
            check$1(
                Array.isArray(data) ||
                isTypedArray(data) ||
                isNDArrayLike(data),
                'invalid data for element buffer');
          }
          if ('usage' in options) {
            check$1.parameter(
              options.usage,
              usageTypes,
              'invalid element buffer usage');
            usage = usageTypes[options.usage];
          }
          if ('primitive' in options) {
            check$1.parameter(
              options.primitive,
              primTypes,
              'invalid element buffer primitive');
            primType = primTypes[options.primitive];
          }
          if ('count' in options) {
            check$1(
              typeof options.count === 'number' && options.count >= 0,
              'invalid vertex count for elements');
            vertCount = options.count | 0;
          }
          if ('type' in options) {
            check$1.parameter(
              options.type,
              elementTypes,
              'invalid buffer type');
            dtype = elementTypes[options.type];
          }
          if ('length' in options) {
            byteLength = options.length | 0;
          } else {
            byteLength = vertCount;
            if (dtype === GL_UNSIGNED_SHORT$2 || dtype === GL_SHORT$2) {
              byteLength *= 2;
            } else if (dtype === GL_UNSIGNED_INT$2 || dtype === GL_INT$2) {
              byteLength *= 4;
            }
          }
        }
        initElements(
          elements,
          data,
          usage,
          primType,
          vertCount,
          byteLength,
          dtype);
      }

      return reglElements
    }

    reglElements(options);

    reglElements._reglType = 'elements';
    reglElements._elements = elements;
    reglElements.subdata = function (data, offset) {
      buffer.subdata(data, offset);
      return reglElements
    };
    reglElements.destroy = function () {
      destroyElements(elements);
    };

    return reglElements
  }

  return {
    create: createElements,
    createStream: createElementStream,
    destroyStream: destroyElementStream,
    getElements: function (elements) {
      if (typeof elements === 'function' &&
          elements._elements instanceof REGLElementBuffer) {
        return elements._elements
      }
      return null
    },
    clear: function () {
      values(elementSet).forEach(destroyElements);
    }
  }
}

var FLOAT = new Float32Array(1);
var INT = new Uint32Array(FLOAT.buffer);

var GL_UNSIGNED_SHORT$4 = 5123;

function convertToHalfFloat (array) {
  var ushorts = pool.allocType(GL_UNSIGNED_SHORT$4, array.length);

  for (var i = 0; i < array.length; ++i) {
    if (isNaN(array[i])) {
      ushorts[i] = 0xffff;
    } else if (array[i] === Infinity) {
      ushorts[i] = 0x7c00;
    } else if (array[i] === -Infinity) {
      ushorts[i] = 0xfc00;
    } else {
      FLOAT[0] = array[i];
      var x = INT[0];

      var sgn = (x >>> 31) << 15;
      var exp = ((x << 1) >>> 24) - 127;
      var frac = (x >> 13) & ((1 << 10) - 1);

      if (exp < -24) {
        // round non-representable denormals to 0
        ushorts[i] = sgn;
      } else if (exp < -14) {
        // handle denormals
        var s = -14 - exp;
        ushorts[i] = sgn + ((frac + (1 << 10)) >> s);
      } else if (exp > 15) {
        // round overflow to +/- Infinity
        ushorts[i] = sgn + 0x7c00;
      } else {
        // otherwise convert directly
        ushorts[i] = sgn + ((exp + 15) << 10) + frac;
      }
    }
  }

  return ushorts
}

function isArrayLike (s) {
  return Array.isArray(s) || isTypedArray(s)
}

var isPow2$1 = function (v) {
  return !(v & (v - 1)) && (!!v)
};

var GL_COMPRESSED_TEXTURE_FORMATS = 0x86A3;

var GL_TEXTURE_2D$1 = 0x0DE1;
var GL_TEXTURE_CUBE_MAP$1 = 0x8513;
var GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 = 0x8515;

var GL_RGBA$1 = 0x1908;
var GL_ALPHA = 0x1906;
var GL_RGB = 0x1907;
var GL_LUMINANCE = 0x1909;
var GL_LUMINANCE_ALPHA = 0x190A;

var GL_RGBA4 = 0x8056;
var GL_RGB5_A1 = 0x8057;
var GL_RGB565 = 0x8D62;

var GL_UNSIGNED_SHORT_4_4_4_4$1 = 0x8033;
var GL_UNSIGNED_SHORT_5_5_5_1$1 = 0x8034;
var GL_UNSIGNED_SHORT_5_6_5$1 = 0x8363;
var GL_UNSIGNED_INT_24_8_WEBGL$1 = 0x84FA;

var GL_DEPTH_COMPONENT = 0x1902;
var GL_DEPTH_STENCIL = 0x84F9;

var GL_SRGB_EXT = 0x8C40;
var GL_SRGB_ALPHA_EXT = 0x8C42;

var GL_HALF_FLOAT_OES$1 = 0x8D61;

var GL_COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
var GL_COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
var GL_COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
var GL_COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

var GL_COMPRESSED_RGB_ATC_WEBGL = 0x8C92;
var GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 0x8C93;
var GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 0x87EE;

var GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8C00;
var GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8C01;
var GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8C02;
var GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8C03;

var GL_COMPRESSED_RGB_ETC1_WEBGL = 0x8D64;

var GL_UNSIGNED_BYTE$5 = 0x1401;
var GL_UNSIGNED_SHORT$3 = 0x1403;
var GL_UNSIGNED_INT$3 = 0x1405;
var GL_FLOAT$4 = 0x1406;

var GL_TEXTURE_WRAP_S = 0x2802;
var GL_TEXTURE_WRAP_T = 0x2803;

var GL_REPEAT = 0x2901;
var GL_CLAMP_TO_EDGE$1 = 0x812F;
var GL_MIRRORED_REPEAT = 0x8370;

var GL_TEXTURE_MAG_FILTER = 0x2800;
var GL_TEXTURE_MIN_FILTER = 0x2801;

var GL_NEAREST$1 = 0x2600;
var GL_LINEAR = 0x2601;
var GL_NEAREST_MIPMAP_NEAREST$1 = 0x2700;
var GL_LINEAR_MIPMAP_NEAREST$1 = 0x2701;
var GL_NEAREST_MIPMAP_LINEAR$1 = 0x2702;
var GL_LINEAR_MIPMAP_LINEAR$1 = 0x2703;

var GL_GENERATE_MIPMAP_HINT = 0x8192;
var GL_DONT_CARE = 0x1100;
var GL_FASTEST = 0x1101;
var GL_NICEST = 0x1102;

var GL_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;

var GL_UNPACK_ALIGNMENT = 0x0CF5;
var GL_UNPACK_FLIP_Y_WEBGL = 0x9240;
var GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
var GL_UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;

var GL_BROWSER_DEFAULT_WEBGL = 0x9244;

var GL_TEXTURE0$1 = 0x84C0;

var MIPMAP_FILTERS = [
  GL_NEAREST_MIPMAP_NEAREST$1,
  GL_NEAREST_MIPMAP_LINEAR$1,
  GL_LINEAR_MIPMAP_NEAREST$1,
  GL_LINEAR_MIPMAP_LINEAR$1
];

var CHANNELS_FORMAT = [
  0,
  GL_LUMINANCE,
  GL_LUMINANCE_ALPHA,
  GL_RGB,
  GL_RGBA$1
];

var FORMAT_CHANNELS = {};
FORMAT_CHANNELS[GL_LUMINANCE] =
FORMAT_CHANNELS[GL_ALPHA] =
FORMAT_CHANNELS[GL_DEPTH_COMPONENT] = 1;
FORMAT_CHANNELS[GL_DEPTH_STENCIL] =
FORMAT_CHANNELS[GL_LUMINANCE_ALPHA] = 2;
FORMAT_CHANNELS[GL_RGB] =
FORMAT_CHANNELS[GL_SRGB_EXT] = 3;
FORMAT_CHANNELS[GL_RGBA$1] =
FORMAT_CHANNELS[GL_SRGB_ALPHA_EXT] = 4;

function objectName (str) {
  return '[object ' + str + ']'
}

var CANVAS_CLASS = objectName('HTMLCanvasElement');
var CONTEXT2D_CLASS = objectName('CanvasRenderingContext2D');
var BITMAP_CLASS = objectName('ImageBitmap');
var IMAGE_CLASS = objectName('HTMLImageElement');
var VIDEO_CLASS = objectName('HTMLVideoElement');

var PIXEL_CLASSES = Object.keys(arrayTypes).concat([
  CANVAS_CLASS,
  CONTEXT2D_CLASS,
  BITMAP_CLASS,
  IMAGE_CLASS,
  VIDEO_CLASS
]);

// for every texture type, store
// the size in bytes.
var TYPE_SIZES = [];
TYPE_SIZES[GL_UNSIGNED_BYTE$5] = 1;
TYPE_SIZES[GL_FLOAT$4] = 4;
TYPE_SIZES[GL_HALF_FLOAT_OES$1] = 2;

TYPE_SIZES[GL_UNSIGNED_SHORT$3] = 2;
TYPE_SIZES[GL_UNSIGNED_INT$3] = 4;

var FORMAT_SIZES_SPECIAL = [];
FORMAT_SIZES_SPECIAL[GL_RGBA4] = 2;
FORMAT_SIZES_SPECIAL[GL_RGB5_A1] = 2;
FORMAT_SIZES_SPECIAL[GL_RGB565] = 2;
FORMAT_SIZES_SPECIAL[GL_DEPTH_STENCIL] = 4;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_S3TC_DXT1_EXT] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT1_EXT] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT3_EXT] = 1;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT5_EXT] = 1;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ATC_WEBGL] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL] = 1;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL] = 1;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG] = 0.25;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG] = 0.25;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ETC1_WEBGL] = 0.5;

function isNumericArray (arr) {
  return (
    Array.isArray(arr) &&
    (arr.length === 0 ||
    typeof arr[0] === 'number'))
}

function isRectArray (arr) {
  if (!Array.isArray(arr)) {
    return false
  }
  var width = arr.length;
  if (width === 0 || !isArrayLike(arr[0])) {
    return false
  }
  return true
}

function classString (x) {
  return Object.prototype.toString.call(x)
}

function isCanvasElement (object) {
  return classString(object) === CANVAS_CLASS
}

function isContext2D (object) {
  return classString(object) === CONTEXT2D_CLASS
}

function isBitmap (object) {
  return classString(object) === BITMAP_CLASS
}

function isImageElement (object) {
  return classString(object) === IMAGE_CLASS
}

function isVideoElement (object) {
  return classString(object) === VIDEO_CLASS
}

function isPixelData (object) {
  if (!object) {
    return false
  }
  var className = classString(object);
  if (PIXEL_CLASSES.indexOf(className) >= 0) {
    return true
  }
  return (
    isNumericArray(object) ||
    isRectArray(object) ||
    isNDArrayLike(object))
}

function typedArrayCode$1 (data) {
  return arrayTypes[Object.prototype.toString.call(data)] | 0
}

function convertData (result, data) {
  var n = data.length;
  switch (result.type) {
    case GL_UNSIGNED_BYTE$5:
    case GL_UNSIGNED_SHORT$3:
    case GL_UNSIGNED_INT$3:
    case GL_FLOAT$4:
      var converted = pool.allocType(result.type, n);
      converted.set(data);
      result.data = converted;
      break

    case GL_HALF_FLOAT_OES$1:
      result.data = convertToHalfFloat(data);
      break

    default:
      check$1.raise('unsupported texture type, must specify a typed array');
  }
}

function preConvert (image, n) {
  return pool.allocType(
    image.type === GL_HALF_FLOAT_OES$1
      ? GL_FLOAT$4
      : image.type, n)
}

function postConvert (image, data) {
  if (image.type === GL_HALF_FLOAT_OES$1) {
    image.data = convertToHalfFloat(data);
    pool.freeType(data);
  } else {
    image.data = data;
  }
}

function transposeData (image, array, strideX, strideY, strideC, offset) {
  var w = image.width;
  var h = image.height;
  var c = image.channels;
  var n = w * h * c;
  var data = preConvert(image, n);

  var p = 0;
  for (var i = 0; i < h; ++i) {
    for (var j = 0; j < w; ++j) {
      for (var k = 0; k < c; ++k) {
        data[p++] = array[strideX * j + strideY * i + strideC * k + offset];
      }
    }
  }

  postConvert(image, data);
}

function getTextureSize (format, type, width, height, isMipmap, isCube) {
  var s;
  if (typeof FORMAT_SIZES_SPECIAL[format] !== 'undefined') {
    // we have a special array for dealing with weird color formats such as RGB5A1
    s = FORMAT_SIZES_SPECIAL[format];
  } else {
    s = FORMAT_CHANNELS[format] * TYPE_SIZES[type];
  }

  if (isCube) {
    s *= 6;
  }

  if (isMipmap) {
    // compute the total size of all the mipmaps.
    var total = 0;

    var w = width;
    while (w >= 1) {
      // we can only use mipmaps on a square image,
      // so we can simply use the width and ignore the height:
      total += s * w * w;
      w /= 2;
    }
    return total
  } else {
    return s * width * height
  }
}

function createTextureSet (
  gl, extensions, limits, reglPoll, contextState, stats, config) {
  // -------------------------------------------------------
  // Initialize constants and parameter tables here
  // -------------------------------------------------------
  var mipmapHint = {
    "don't care": GL_DONT_CARE,
    'dont care': GL_DONT_CARE,
    'nice': GL_NICEST,
    'fast': GL_FASTEST
  };

  var wrapModes = {
    'repeat': GL_REPEAT,
    'clamp': GL_CLAMP_TO_EDGE$1,
    'mirror': GL_MIRRORED_REPEAT
  };

  var magFilters = {
    'nearest': GL_NEAREST$1,
    'linear': GL_LINEAR
  };

  var minFilters = extend({
    'mipmap': GL_LINEAR_MIPMAP_LINEAR$1,
    'nearest mipmap nearest': GL_NEAREST_MIPMAP_NEAREST$1,
    'linear mipmap nearest': GL_LINEAR_MIPMAP_NEAREST$1,
    'nearest mipmap linear': GL_NEAREST_MIPMAP_LINEAR$1,
    'linear mipmap linear': GL_LINEAR_MIPMAP_LINEAR$1
  }, magFilters);

  var colorSpace = {
    'none': 0,
    'browser': GL_BROWSER_DEFAULT_WEBGL
  };

  var textureTypes = {
    'uint8': GL_UNSIGNED_BYTE$5,
    'rgba4': GL_UNSIGNED_SHORT_4_4_4_4$1,
    'rgb565': GL_UNSIGNED_SHORT_5_6_5$1,
    'rgb5 a1': GL_UNSIGNED_SHORT_5_5_5_1$1
  };

  var textureFormats = {
    'alpha': GL_ALPHA,
    'luminance': GL_LUMINANCE,
    'luminance alpha': GL_LUMINANCE_ALPHA,
    'rgb': GL_RGB,
    'rgba': GL_RGBA$1,
    'rgba4': GL_RGBA4,
    'rgb5 a1': GL_RGB5_A1,
    'rgb565': GL_RGB565
  };

  var compressedTextureFormats = {};

  if (extensions.ext_srgb) {
    textureFormats.srgb = GL_SRGB_EXT;
    textureFormats.srgba = GL_SRGB_ALPHA_EXT;
  }

  if (extensions.oes_texture_float) {
    textureTypes.float32 = textureTypes.float = GL_FLOAT$4;
  }

  if (extensions.oes_texture_half_float) {
    textureTypes['float16'] = textureTypes['half float'] = GL_HALF_FLOAT_OES$1;
  }

  if (extensions.webgl_depth_texture) {
    extend(textureFormats, {
      'depth': GL_DEPTH_COMPONENT,
      'depth stencil': GL_DEPTH_STENCIL
    });

    extend(textureTypes, {
      'uint16': GL_UNSIGNED_SHORT$3,
      'uint32': GL_UNSIGNED_INT$3,
      'depth stencil': GL_UNSIGNED_INT_24_8_WEBGL$1
    });
  }

  if (extensions.webgl_compressed_texture_s3tc) {
    extend(compressedTextureFormats, {
      'rgb s3tc dxt1': GL_COMPRESSED_RGB_S3TC_DXT1_EXT,
      'rgba s3tc dxt1': GL_COMPRESSED_RGBA_S3TC_DXT1_EXT,
      'rgba s3tc dxt3': GL_COMPRESSED_RGBA_S3TC_DXT3_EXT,
      'rgba s3tc dxt5': GL_COMPRESSED_RGBA_S3TC_DXT5_EXT
    });
  }

  if (extensions.webgl_compressed_texture_atc) {
    extend(compressedTextureFormats, {
      'rgb atc': GL_COMPRESSED_RGB_ATC_WEBGL,
      'rgba atc explicit alpha': GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL,
      'rgba atc interpolated alpha': GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
    });
  }

  if (extensions.webgl_compressed_texture_pvrtc) {
    extend(compressedTextureFormats, {
      'rgb pvrtc 4bppv1': GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
      'rgb pvrtc 2bppv1': GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG,
      'rgba pvrtc 4bppv1': GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
      'rgba pvrtc 2bppv1': GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
    });
  }

  if (extensions.webgl_compressed_texture_etc1) {
    compressedTextureFormats['rgb etc1'] = GL_COMPRESSED_RGB_ETC1_WEBGL;
  }

  // Copy over all texture formats
  var supportedCompressedFormats = Array.prototype.slice.call(
    gl.getParameter(GL_COMPRESSED_TEXTURE_FORMATS));
  Object.keys(compressedTextureFormats).forEach(function (name) {
    var format = compressedTextureFormats[name];
    if (supportedCompressedFormats.indexOf(format) >= 0) {
      textureFormats[name] = format;
    }
  });

  var supportedFormats = Object.keys(textureFormats);
  limits.textureFormats = supportedFormats;

  // associate with every format string its
  // corresponding GL-value.
  var textureFormatsInvert = [];
  Object.keys(textureFormats).forEach(function (key) {
    var val = textureFormats[key];
    textureFormatsInvert[val] = key;
  });

  // associate with every type string its
  // corresponding GL-value.
  var textureTypesInvert = [];
  Object.keys(textureTypes).forEach(function (key) {
    var val = textureTypes[key];
    textureTypesInvert[val] = key;
  });

  var magFiltersInvert = [];
  Object.keys(magFilters).forEach(function (key) {
    var val = magFilters[key];
    magFiltersInvert[val] = key;
  });

  var minFiltersInvert = [];
  Object.keys(minFilters).forEach(function (key) {
    var val = minFilters[key];
    minFiltersInvert[val] = key;
  });

  var wrapModesInvert = [];
  Object.keys(wrapModes).forEach(function (key) {
    var val = wrapModes[key];
    wrapModesInvert[val] = key;
  });

  // colorFormats[] gives the format (channels) associated to an
  // internalformat
  var colorFormats = supportedFormats.reduce(function (color, key) {
    var glenum = textureFormats[key];
    if (glenum === GL_LUMINANCE ||
        glenum === GL_ALPHA ||
        glenum === GL_LUMINANCE ||
        glenum === GL_LUMINANCE_ALPHA ||
        glenum === GL_DEPTH_COMPONENT ||
        glenum === GL_DEPTH_STENCIL) {
      color[glenum] = glenum;
    } else if (glenum === GL_RGB5_A1 || key.indexOf('rgba') >= 0) {
      color[glenum] = GL_RGBA$1;
    } else {
      color[glenum] = GL_RGB;
    }
    return color
  }, {});

  function TexFlags () {
    // format info
    this.internalformat = GL_RGBA$1;
    this.format = GL_RGBA$1;
    this.type = GL_UNSIGNED_BYTE$5;
    this.compressed = false;

    // pixel storage
    this.premultiplyAlpha = false;
    this.flipY = false;
    this.unpackAlignment = 1;
    this.colorSpace = GL_BROWSER_DEFAULT_WEBGL;

    // shape info
    this.width = 0;
    this.height = 0;
    this.channels = 0;
  }

  function copyFlags (result, other) {
    result.internalformat = other.internalformat;
    result.format = other.format;
    result.type = other.type;
    result.compressed = other.compressed;

    result.premultiplyAlpha = other.premultiplyAlpha;
    result.flipY = other.flipY;
    result.unpackAlignment = other.unpackAlignment;
    result.colorSpace = other.colorSpace;

    result.width = other.width;
    result.height = other.height;
    result.channels = other.channels;
  }

  function parseFlags (flags, options) {
    if (typeof options !== 'object' || !options) {
      return
    }

    if ('premultiplyAlpha' in options) {
      check$1.type(options.premultiplyAlpha, 'boolean',
        'invalid premultiplyAlpha');
      flags.premultiplyAlpha = options.premultiplyAlpha;
    }

    if ('flipY' in options) {
      check$1.type(options.flipY, 'boolean',
        'invalid texture flip');
      flags.flipY = options.flipY;
    }

    if ('alignment' in options) {
      check$1.oneOf(options.alignment, [1, 2, 4, 8],
        'invalid texture unpack alignment');
      flags.unpackAlignment = options.alignment;
    }

    if ('colorSpace' in options) {
      check$1.parameter(options.colorSpace, colorSpace,
        'invalid colorSpace');
      flags.colorSpace = colorSpace[options.colorSpace];
    }

    if ('type' in options) {
      var type = options.type;
      check$1(extensions.oes_texture_float ||
        !(type === 'float' || type === 'float32'),
        'you must enable the OES_texture_float extension in order to use floating point textures.');
      check$1(extensions.oes_texture_half_float ||
        !(type === 'half float' || type === 'float16'),
        'you must enable the OES_texture_half_float extension in order to use 16-bit floating point textures.');
      check$1(extensions.webgl_depth_texture ||
        !(type === 'uint16' || type === 'uint32' || type === 'depth stencil'),
        'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
      check$1.parameter(type, textureTypes,
        'invalid texture type');
      flags.type = textureTypes[type];
    }

    var w = flags.width;
    var h = flags.height;
    var c = flags.channels;
    var hasChannels = false;
    if ('shape' in options) {
      check$1(Array.isArray(options.shape) && options.shape.length >= 2,
        'shape must be an array');
      w = options.shape[0];
      h = options.shape[1];
      if (options.shape.length === 3) {
        c = options.shape[2];
        check$1(c > 0 && c <= 4, 'invalid number of channels');
        hasChannels = true;
      }
      check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
      check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
    } else {
      if ('radius' in options) {
        w = h = options.radius;
        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid radius');
      }
      if ('width' in options) {
        w = options.width;
        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
      }
      if ('height' in options) {
        h = options.height;
        check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
      }
      if ('channels' in options) {
        c = options.channels;
        check$1(c > 0 && c <= 4, 'invalid number of channels');
        hasChannels = true;
      }
    }
    flags.width = w | 0;
    flags.height = h | 0;
    flags.channels = c | 0;

    var hasFormat = false;
    if ('format' in options) {
      var formatStr = options.format;
      check$1(extensions.webgl_depth_texture ||
        !(formatStr === 'depth' || formatStr === 'depth stencil'),
        'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
      check$1.parameter(formatStr, textureFormats,
        'invalid texture format');
      var internalformat = flags.internalformat = textureFormats[formatStr];
      flags.format = colorFormats[internalformat];
      if (formatStr in textureTypes) {
        if (!('type' in options)) {
          flags.type = textureTypes[formatStr];
        }
      }
      if (formatStr in compressedTextureFormats) {
        flags.compressed = true;
      }
      hasFormat = true;
    }

    // Reconcile channels and format
    if (!hasChannels && hasFormat) {
      flags.channels = FORMAT_CHANNELS[flags.format];
    } else if (hasChannels && !hasFormat) {
      if (flags.channels !== CHANNELS_FORMAT[flags.format]) {
        flags.format = flags.internalformat = CHANNELS_FORMAT[flags.channels];
      }
    } else if (hasFormat && hasChannels) {
      check$1(
        flags.channels === FORMAT_CHANNELS[flags.format],
        'number of channels inconsistent with specified format');
    }
  }

  function setFlags (flags) {
    gl.pixelStorei(GL_UNPACK_FLIP_Y_WEBGL, flags.flipY);
    gl.pixelStorei(GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, flags.premultiplyAlpha);
    gl.pixelStorei(GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, flags.colorSpace);
    gl.pixelStorei(GL_UNPACK_ALIGNMENT, flags.unpackAlignment);
  }

  // -------------------------------------------------------
  // Tex image data
  // -------------------------------------------------------
  function TexImage () {
    TexFlags.call(this);

    this.xOffset = 0;
    this.yOffset = 0;

    // data
    this.data = null;
    this.needsFree = false;

    // html element
    this.element = null;

    // copyTexImage info
    this.needsCopy = false;
  }

  function parseImage (image, options) {
    var data = null;
    if (isPixelData(options)) {
      data = options;
    } else if (options) {
      check$1.type(options, 'object', 'invalid pixel data type');
      parseFlags(image, options);
      if ('x' in options) {
        image.xOffset = options.x | 0;
      }
      if ('y' in options) {
        image.yOffset = options.y | 0;
      }
      if (isPixelData(options.data)) {
        data = options.data;
      }
    }

    check$1(
      !image.compressed ||
      data instanceof Uint8Array,
      'compressed texture data must be stored in a uint8array');

    if (options.copy) {
      check$1(!data, 'can not specify copy and data field for the same texture');
      var viewW = contextState.viewportWidth;
      var viewH = contextState.viewportHeight;
      image.width = image.width || (viewW - image.xOffset);
      image.height = image.height || (viewH - image.yOffset);
      image.needsCopy = true;
      check$1(image.xOffset >= 0 && image.xOffset < viewW &&
            image.yOffset >= 0 && image.yOffset < viewH &&
            image.width > 0 && image.width <= viewW &&
            image.height > 0 && image.height <= viewH,
            'copy texture read out of bounds');
    } else if (!data) {
      image.width = image.width || 1;
      image.height = image.height || 1;
      image.channels = image.channels || 4;
    } else if (isTypedArray(data)) {
      image.channels = image.channels || 4;
      image.data = data;
      if (!('type' in options) && image.type === GL_UNSIGNED_BYTE$5) {
        image.type = typedArrayCode$1(data);
      }
    } else if (isNumericArray(data)) {
      image.channels = image.channels || 4;
      convertData(image, data);
      image.alignment = 1;
      image.needsFree = true;
    } else if (isNDArrayLike(data)) {
      var array = data.data;
      if (!Array.isArray(array) && image.type === GL_UNSIGNED_BYTE$5) {
        image.type = typedArrayCode$1(array);
      }
      var shape = data.shape;
      var stride = data.stride;
      var shapeX, shapeY, shapeC, strideX, strideY, strideC;
      if (shape.length === 3) {
        shapeC = shape[2];
        strideC = stride[2];
      } else {
        check$1(shape.length === 2, 'invalid ndarray pixel data, must be 2 or 3D');
        shapeC = 1;
        strideC = 1;
      }
      shapeX = shape[0];
      shapeY = shape[1];
      strideX = stride[0];
      strideY = stride[1];
      image.alignment = 1;
      image.width = shapeX;
      image.height = shapeY;
      image.channels = shapeC;
      image.format = image.internalformat = CHANNELS_FORMAT[shapeC];
      image.needsFree = true;
      transposeData(image, array, strideX, strideY, strideC, data.offset);
    } else if (isCanvasElement(data) || isContext2D(data)) {
      if (isCanvasElement(data)) {
        image.element = data;
      } else {
        image.element = data.canvas;
      }
      image.width = image.element.width;
      image.height = image.element.height;
      image.channels = 4;
    } else if (isBitmap(data)) {
      image.element = data;
      image.width = data.width;
      image.height = data.height;
      image.channels = 4;
    } else if (isImageElement(data)) {
      image.element = data;
      image.width = data.naturalWidth;
      image.height = data.naturalHeight;
      image.channels = 4;
    } else if (isVideoElement(data)) {
      image.element = data;
      image.width = data.videoWidth;
      image.height = data.videoHeight;
      image.channels = 4;
    } else if (isRectArray(data)) {
      var w = image.width || data[0].length;
      var h = image.height || data.length;
      var c = image.channels;
      if (isArrayLike(data[0][0])) {
        c = c || data[0][0].length;
      } else {
        c = c || 1;
      }
      var arrayShape = flattenUtils.shape(data);
      var n = 1;
      for (var dd = 0; dd < arrayShape.length; ++dd) {
        n *= arrayShape[dd];
      }
      var allocData = preConvert(image, n);
      flattenUtils.flatten(data, arrayShape, '', allocData);
      postConvert(image, allocData);
      image.alignment = 1;
      image.width = w;
      image.height = h;
      image.channels = c;
      image.format = image.internalformat = CHANNELS_FORMAT[c];
      image.needsFree = true;
    }

    if (image.type === GL_FLOAT$4) {
      check$1(limits.extensions.indexOf('oes_texture_float') >= 0,
        'oes_texture_float extension not enabled');
    } else if (image.type === GL_HALF_FLOAT_OES$1) {
      check$1(limits.extensions.indexOf('oes_texture_half_float') >= 0,
        'oes_texture_half_float extension not enabled');
    }

    // do compressed texture  validation here.
  }

  function setImage (info, target, miplevel) {
    var element = info.element;
    var data = info.data;
    var internalformat = info.internalformat;
    var format = info.format;
    var type = info.type;
    var width = info.width;
    var height = info.height;
    var channels = info.channels;

    setFlags(info);

    if (element) {
      gl.texImage2D(target, miplevel, format, format, type, element);
    } else if (info.compressed) {
      gl.compressedTexImage2D(target, miplevel, internalformat, width, height, 0, data);
    } else if (info.needsCopy) {
      reglPoll();
      gl.copyTexImage2D(
        target, miplevel, format, info.xOffset, info.yOffset, width, height, 0);
    } else {
      var nullData = !data;
      if (nullData) {
        data = pool.zero.allocType(type, width * height * channels);
      }

      gl.texImage2D(target, miplevel, format, width, height, 0, format, type, data);

      if (nullData && data) {
        pool.zero.freeType(data);
      }
    }
  }

  function setSubImage (info, target, x, y, miplevel) {
    var element = info.element;
    var data = info.data;
    var internalformat = info.internalformat;
    var format = info.format;
    var type = info.type;
    var width = info.width;
    var height = info.height;

    setFlags(info);

    if (element) {
      gl.texSubImage2D(
        target, miplevel, x, y, format, type, element);
    } else if (info.compressed) {
      gl.compressedTexSubImage2D(
        target, miplevel, x, y, internalformat, width, height, data);
    } else if (info.needsCopy) {
      reglPoll();
      gl.copyTexSubImage2D(
        target, miplevel, x, y, info.xOffset, info.yOffset, width, height);
    } else {
      gl.texSubImage2D(
        target, miplevel, x, y, width, height, format, type, data);
    }
  }

  // texImage pool
  var imagePool = [];

  function allocImage () {
    return imagePool.pop() || new TexImage()
  }

  function freeImage (image) {
    if (image.needsFree) {
      pool.freeType(image.data);
    }
    TexImage.call(image);
    imagePool.push(image);
  }

  // -------------------------------------------------------
  // Mip map
  // -------------------------------------------------------
  function MipMap () {
    TexFlags.call(this);

    this.genMipmaps = false;
    this.mipmapHint = GL_DONT_CARE;
    this.mipmask = 0;
    this.images = Array(16);
  }

  function parseMipMapFromShape (mipmap, width, height) {
    var img = mipmap.images[0] = allocImage();
    mipmap.mipmask = 1;
    img.width = mipmap.width = width;
    img.height = mipmap.height = height;
    img.channels = mipmap.channels = 4;
  }

  function parseMipMapFromObject (mipmap, options) {
    var imgData = null;
    if (isPixelData(options)) {
      imgData = mipmap.images[0] = allocImage();
      copyFlags(imgData, mipmap);
      parseImage(imgData, options);
      mipmap.mipmask = 1;
    } else {
      parseFlags(mipmap, options);
      if (Array.isArray(options.mipmap)) {
        var mipData = options.mipmap;
        for (var i = 0; i < mipData.length; ++i) {
          imgData = mipmap.images[i] = allocImage();
          copyFlags(imgData, mipmap);
          imgData.width >>= i;
          imgData.height >>= i;
          parseImage(imgData, mipData[i]);
          mipmap.mipmask |= (1 << i);
        }
      } else {
        imgData = mipmap.images[0] = allocImage();
        copyFlags(imgData, mipmap);
        parseImage(imgData, options);
        mipmap.mipmask = 1;
      }
    }
    copyFlags(mipmap, mipmap.images[0]);

    // For textures of the compressed format WEBGL_compressed_texture_s3tc
    // we must have that
    //
    // "When level equals zero width and height must be a multiple of 4.
    // When level is greater than 0 width and height must be 0, 1, 2 or a multiple of 4. "
    //
    // but we do not yet support having multiple mipmap levels for compressed textures,
    // so we only test for level zero.

    if (mipmap.compressed &&
        (mipmap.internalformat === GL_COMPRESSED_RGB_S3TC_DXT1_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT1_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT3_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT5_EXT)) {
      check$1(mipmap.width % 4 === 0 &&
            mipmap.height % 4 === 0,
            'for compressed texture formats, mipmap level 0 must have width and height that are a multiple of 4');
    }
  }

  function setMipMap (mipmap, target) {
    var images = mipmap.images;
    for (var i = 0; i < images.length; ++i) {
      if (!images[i]) {
        return
      }
      setImage(images[i], target, i);
    }
  }

  var mipPool = [];

  function allocMipMap () {
    var result = mipPool.pop() || new MipMap();
    TexFlags.call(result);
    result.mipmask = 0;
    for (var i = 0; i < 16; ++i) {
      result.images[i] = null;
    }
    return result
  }

  function freeMipMap (mipmap) {
    var images = mipmap.images;
    for (var i = 0; i < images.length; ++i) {
      if (images[i]) {
        freeImage(images[i]);
      }
      images[i] = null;
    }
    mipPool.push(mipmap);
  }

  // -------------------------------------------------------
  // Tex info
  // -------------------------------------------------------
  function TexInfo () {
    this.minFilter = GL_NEAREST$1;
    this.magFilter = GL_NEAREST$1;

    this.wrapS = GL_CLAMP_TO_EDGE$1;
    this.wrapT = GL_CLAMP_TO_EDGE$1;

    this.anisotropic = 1;

    this.genMipmaps = false;
    this.mipmapHint = GL_DONT_CARE;
  }

  function parseTexInfo (info, options) {
    if ('min' in options) {
      var minFilter = options.min;
      check$1.parameter(minFilter, minFilters);
      info.minFilter = minFilters[minFilter];
      if (MIPMAP_FILTERS.indexOf(info.minFilter) >= 0 && !('faces' in options)) {
        info.genMipmaps = true;
      }
    }

    if ('mag' in options) {
      var magFilter = options.mag;
      check$1.parameter(magFilter, magFilters);
      info.magFilter = magFilters[magFilter];
    }

    var wrapS = info.wrapS;
    var wrapT = info.wrapT;
    if ('wrap' in options) {
      var wrap = options.wrap;
      if (typeof wrap === 'string') {
        check$1.parameter(wrap, wrapModes);
        wrapS = wrapT = wrapModes[wrap];
      } else if (Array.isArray(wrap)) {
        check$1.parameter(wrap[0], wrapModes);
        check$1.parameter(wrap[1], wrapModes);
        wrapS = wrapModes[wrap[0]];
        wrapT = wrapModes[wrap[1]];
      }
    } else {
      if ('wrapS' in options) {
        var optWrapS = options.wrapS;
        check$1.parameter(optWrapS, wrapModes);
        wrapS = wrapModes[optWrapS];
      }
      if ('wrapT' in options) {
        var optWrapT = options.wrapT;
        check$1.parameter(optWrapT, wrapModes);
        wrapT = wrapModes[optWrapT];
      }
    }
    info.wrapS = wrapS;
    info.wrapT = wrapT;

    if ('anisotropic' in options) {
      var anisotropic = options.anisotropic;
      check$1(typeof anisotropic === 'number' &&
         anisotropic >= 1 && anisotropic <= limits.maxAnisotropic,
        'aniso samples must be between 1 and ');
      info.anisotropic = options.anisotropic;
    }

    if ('mipmap' in options) {
      var hasMipMap = false;
      switch (typeof options.mipmap) {
        case 'string':
          check$1.parameter(options.mipmap, mipmapHint,
            'invalid mipmap hint');
          info.mipmapHint = mipmapHint[options.mipmap];
          info.genMipmaps = true;
          hasMipMap = true;
          break

        case 'boolean':
          hasMipMap = info.genMipmaps = options.mipmap;
          break

        case 'object':
          check$1(Array.isArray(options.mipmap), 'invalid mipmap type');
          info.genMipmaps = false;
          hasMipMap = true;
          break

        default:
          check$1.raise('invalid mipmap type');
      }
      if (hasMipMap && !('min' in options)) {
        info.minFilter = GL_NEAREST_MIPMAP_NEAREST$1;
      }
    }
  }

  function setTexInfo (info, target) {
    gl.texParameteri(target, GL_TEXTURE_MIN_FILTER, info.minFilter);
    gl.texParameteri(target, GL_TEXTURE_MAG_FILTER, info.magFilter);
    gl.texParameteri(target, GL_TEXTURE_WRAP_S, info.wrapS);
    gl.texParameteri(target, GL_TEXTURE_WRAP_T, info.wrapT);
    if (extensions.ext_texture_filter_anisotropic) {
      gl.texParameteri(target, GL_TEXTURE_MAX_ANISOTROPY_EXT, info.anisotropic);
    }
    if (info.genMipmaps) {
      gl.hint(GL_GENERATE_MIPMAP_HINT, info.mipmapHint);
      gl.generateMipmap(target);
    }
  }

  // -------------------------------------------------------
  // Full texture object
  // -------------------------------------------------------
  var textureCount = 0;
  var textureSet = {};
  var numTexUnits = limits.maxTextureUnits;
  var textureUnits = Array(numTexUnits).map(function () {
    return null
  });

  function REGLTexture (target) {
    TexFlags.call(this);
    this.mipmask = 0;
    this.internalformat = GL_RGBA$1;

    this.id = textureCount++;

    this.refCount = 1;

    this.target = target;
    this.texture = gl.createTexture();

    this.unit = -1;
    this.bindCount = 0;

    this.texInfo = new TexInfo();

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  function tempBind (texture) {
    gl.activeTexture(GL_TEXTURE0$1);
    gl.bindTexture(texture.target, texture.texture);
  }

  function tempRestore () {
    var prev = textureUnits[0];
    if (prev) {
      gl.bindTexture(prev.target, prev.texture);
    } else {
      gl.bindTexture(GL_TEXTURE_2D$1, null);
    }
  }

  function destroy (texture) {
    var handle = texture.texture;
    check$1(handle, 'must not double destroy texture');
    var unit = texture.unit;
    var target = texture.target;
    if (unit >= 0) {
      gl.activeTexture(GL_TEXTURE0$1 + unit);
      gl.bindTexture(target, null);
      textureUnits[unit] = null;
    }
    gl.deleteTexture(handle);
    texture.texture = null;
    texture.params = null;
    texture.pixels = null;
    texture.refCount = 0;
    delete textureSet[texture.id];
    stats.textureCount--;
  }

  extend(REGLTexture.prototype, {
    bind: function () {
      var texture = this;
      texture.bindCount += 1;
      var unit = texture.unit;
      if (unit < 0) {
        for (var i = 0; i < numTexUnits; ++i) {
          var other = textureUnits[i];
          if (other) {
            if (other.bindCount > 0) {
              continue
            }
            other.unit = -1;
          }
          textureUnits[i] = texture;
          unit = i;
          break
        }
        if (unit >= numTexUnits) {
          check$1.raise('insufficient number of texture units');
        }
        if (config.profile && stats.maxTextureUnits < (unit + 1)) {
          stats.maxTextureUnits = unit + 1; // +1, since the units are zero-based
        }
        texture.unit = unit;
        gl.activeTexture(GL_TEXTURE0$1 + unit);
        gl.bindTexture(texture.target, texture.texture);
      }
      return unit
    },

    unbind: function () {
      this.bindCount -= 1;
    },

    decRef: function () {
      if (--this.refCount <= 0) {
        destroy(this);
      }
    }
  });

  function createTexture2D (a, b) {
    var texture = new REGLTexture(GL_TEXTURE_2D$1);
    textureSet[texture.id] = texture;
    stats.textureCount++;

    function reglTexture2D (a, b) {
      var texInfo = texture.texInfo;
      TexInfo.call(texInfo);
      var mipData = allocMipMap();

      if (typeof a === 'number') {
        if (typeof b === 'number') {
          parseMipMapFromShape(mipData, a | 0, b | 0);
        } else {
          parseMipMapFromShape(mipData, a | 0, a | 0);
        }
      } else if (a) {
        check$1.type(a, 'object', 'invalid arguments to regl.texture');
        parseTexInfo(texInfo, a);
        parseMipMapFromObject(mipData, a);
      } else {
        // empty textures get assigned a default shape of 1x1
        parseMipMapFromShape(mipData, 1, 1);
      }

      if (texInfo.genMipmaps) {
        mipData.mipmask = (mipData.width << 1) - 1;
      }
      texture.mipmask = mipData.mipmask;

      copyFlags(texture, mipData);

      check$1.texture2D(texInfo, mipData, limits);
      texture.internalformat = mipData.internalformat;

      reglTexture2D.width = mipData.width;
      reglTexture2D.height = mipData.height;

      tempBind(texture);
      setMipMap(mipData, GL_TEXTURE_2D$1);
      setTexInfo(texInfo, GL_TEXTURE_2D$1);
      tempRestore();

      freeMipMap(mipData);

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          mipData.width,
          mipData.height,
          texInfo.genMipmaps,
          false);
      }
      reglTexture2D.format = textureFormatsInvert[texture.internalformat];
      reglTexture2D.type = textureTypesInvert[texture.type];

      reglTexture2D.mag = magFiltersInvert[texInfo.magFilter];
      reglTexture2D.min = minFiltersInvert[texInfo.minFilter];

      reglTexture2D.wrapS = wrapModesInvert[texInfo.wrapS];
      reglTexture2D.wrapT = wrapModesInvert[texInfo.wrapT];

      return reglTexture2D
    }

    function subimage (image, x_, y_, level_) {
      check$1(!!image, 'must specify image data');

      var x = x_ | 0;
      var y = y_ | 0;
      var level = level_ | 0;

      var imageData = allocImage();
      copyFlags(imageData, texture);
      imageData.width = 0;
      imageData.height = 0;
      parseImage(imageData, image);
      imageData.width = imageData.width || ((texture.width >> level) - x);
      imageData.height = imageData.height || ((texture.height >> level) - y);

      check$1(
        texture.type === imageData.type &&
        texture.format === imageData.format &&
        texture.internalformat === imageData.internalformat,
        'incompatible format for texture.subimage');
      check$1(
        x >= 0 && y >= 0 &&
        x + imageData.width <= texture.width &&
        y + imageData.height <= texture.height,
        'texture.subimage write out of bounds');
      check$1(
        texture.mipmask & (1 << level),
        'missing mipmap data');
      check$1(
        imageData.data || imageData.element || imageData.needsCopy,
        'missing image data');

      tempBind(texture);
      setSubImage(imageData, GL_TEXTURE_2D$1, x, y, level);
      tempRestore();

      freeImage(imageData);

      return reglTexture2D
    }

    function resize (w_, h_) {
      var w = w_ | 0;
      var h = (h_ | 0) || w;
      if (w === texture.width && h === texture.height) {
        return reglTexture2D
      }

      reglTexture2D.width = texture.width = w;
      reglTexture2D.height = texture.height = h;

      tempBind(texture);

      var data;
      var channels = texture.channels;
      var type = texture.type;

      for (var i = 0; texture.mipmask >> i; ++i) {
        var _w = w >> i;
        var _h = h >> i;
        if (!_w || !_h) break
        data = pool.zero.allocType(type, _w * _h * channels);
        gl.texImage2D(
          GL_TEXTURE_2D$1,
          i,
          texture.format,
          _w,
          _h,
          0,
          texture.format,
          texture.type,
          data);
        if (data) pool.zero.freeType(data);
      }
      tempRestore();

      // also, recompute the texture size.
      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          w,
          h,
          false,
          false);
      }

      return reglTexture2D
    }

    reglTexture2D(a, b);

    reglTexture2D.subimage = subimage;
    reglTexture2D.resize = resize;
    reglTexture2D._reglType = 'texture2d';
    reglTexture2D._texture = texture;
    if (config.profile) {
      reglTexture2D.stats = texture.stats;
    }
    reglTexture2D.destroy = function () {
      texture.decRef();
    };

    return reglTexture2D
  }

  function createTextureCube (a0, a1, a2, a3, a4, a5) {
    var texture = new REGLTexture(GL_TEXTURE_CUBE_MAP$1);
    textureSet[texture.id] = texture;
    stats.cubeCount++;

    var faces = new Array(6);

    function reglTextureCube (a0, a1, a2, a3, a4, a5) {
      var i;
      var texInfo = texture.texInfo;
      TexInfo.call(texInfo);
      for (i = 0; i < 6; ++i) {
        faces[i] = allocMipMap();
      }

      if (typeof a0 === 'number' || !a0) {
        var s = (a0 | 0) || 1;
        for (i = 0; i < 6; ++i) {
          parseMipMapFromShape(faces[i], s, s);
        }
      } else if (typeof a0 === 'object') {
        if (a1) {
          parseMipMapFromObject(faces[0], a0);
          parseMipMapFromObject(faces[1], a1);
          parseMipMapFromObject(faces[2], a2);
          parseMipMapFromObject(faces[3], a3);
          parseMipMapFromObject(faces[4], a4);
          parseMipMapFromObject(faces[5], a5);
        } else {
          parseTexInfo(texInfo, a0);
          parseFlags(texture, a0);
          if ('faces' in a0) {
            var face_input = a0.faces;
            check$1(Array.isArray(face_input) && face_input.length === 6,
              'cube faces must be a length 6 array');
            for (i = 0; i < 6; ++i) {
              check$1(typeof face_input[i] === 'object' && !!face_input[i],
                'invalid input for cube map face');
              copyFlags(faces[i], texture);
              parseMipMapFromObject(faces[i], face_input[i]);
            }
          } else {
            for (i = 0; i < 6; ++i) {
              parseMipMapFromObject(faces[i], a0);
            }
          }
        }
      } else {
        check$1.raise('invalid arguments to cube map');
      }

      copyFlags(texture, faces[0]);

      if (!limits.npotTextureCube) {
        check$1(isPow2$1(texture.width) && isPow2$1(texture.height), 'your browser does not support non power or two texture dimensions');
      }

      if (texInfo.genMipmaps) {
        texture.mipmask = (faces[0].width << 1) - 1;
      } else {
        texture.mipmask = faces[0].mipmask;
      }

      check$1.textureCube(texture, texInfo, faces, limits);
      texture.internalformat = faces[0].internalformat;

      reglTextureCube.width = faces[0].width;
      reglTextureCube.height = faces[0].height;

      tempBind(texture);
      for (i = 0; i < 6; ++i) {
        setMipMap(faces[i], GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i);
      }
      setTexInfo(texInfo, GL_TEXTURE_CUBE_MAP$1);
      tempRestore();

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          reglTextureCube.width,
          reglTextureCube.height,
          texInfo.genMipmaps,
          true);
      }

      reglTextureCube.format = textureFormatsInvert[texture.internalformat];
      reglTextureCube.type = textureTypesInvert[texture.type];

      reglTextureCube.mag = magFiltersInvert[texInfo.magFilter];
      reglTextureCube.min = minFiltersInvert[texInfo.minFilter];

      reglTextureCube.wrapS = wrapModesInvert[texInfo.wrapS];
      reglTextureCube.wrapT = wrapModesInvert[texInfo.wrapT];

      for (i = 0; i < 6; ++i) {
        freeMipMap(faces[i]);
      }

      return reglTextureCube
    }

    function subimage (face, image, x_, y_, level_) {
      check$1(!!image, 'must specify image data');
      check$1(typeof face === 'number' && face === (face | 0) &&
        face >= 0 && face < 6, 'invalid face');

      var x = x_ | 0;
      var y = y_ | 0;
      var level = level_ | 0;

      var imageData = allocImage();
      copyFlags(imageData, texture);
      imageData.width = 0;
      imageData.height = 0;
      parseImage(imageData, image);
      imageData.width = imageData.width || ((texture.width >> level) - x);
      imageData.height = imageData.height || ((texture.height >> level) - y);

      check$1(
        texture.type === imageData.type &&
        texture.format === imageData.format &&
        texture.internalformat === imageData.internalformat,
        'incompatible format for texture.subimage');
      check$1(
        x >= 0 && y >= 0 &&
        x + imageData.width <= texture.width &&
        y + imageData.height <= texture.height,
        'texture.subimage write out of bounds');
      check$1(
        texture.mipmask & (1 << level),
        'missing mipmap data');
      check$1(
        imageData.data || imageData.element || imageData.needsCopy,
        'missing image data');

      tempBind(texture);
      setSubImage(imageData, GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + face, x, y, level);
      tempRestore();

      freeImage(imageData);

      return reglTextureCube
    }

    function resize (radius_) {
      var radius = radius_ | 0;
      if (radius === texture.width) {
        return
      }

      reglTextureCube.width = texture.width = radius;
      reglTextureCube.height = texture.height = radius;

      tempBind(texture);
      for (var i = 0; i < 6; ++i) {
        for (var j = 0; texture.mipmask >> j; ++j) {
          gl.texImage2D(
            GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i,
            j,
            texture.format,
            radius >> j,
            radius >> j,
            0,
            texture.format,
            texture.type,
            null);
        }
      }
      tempRestore();

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          reglTextureCube.width,
          reglTextureCube.height,
          false,
          true);
      }

      return reglTextureCube
    }

    reglTextureCube(a0, a1, a2, a3, a4, a5);

    reglTextureCube.subimage = subimage;
    reglTextureCube.resize = resize;
    reglTextureCube._reglType = 'textureCube';
    reglTextureCube._texture = texture;
    if (config.profile) {
      reglTextureCube.stats = texture.stats;
    }
    reglTextureCube.destroy = function () {
      texture.decRef();
    };

    return reglTextureCube
  }

  // Called when regl is destroyed
  function destroyTextures () {
    for (var i = 0; i < numTexUnits; ++i) {
      gl.activeTexture(GL_TEXTURE0$1 + i);
      gl.bindTexture(GL_TEXTURE_2D$1, null);
      textureUnits[i] = null;
    }
    values(textureSet).forEach(destroy);

    stats.cubeCount = 0;
    stats.textureCount = 0;
  }

  if (config.profile) {
    stats.getTotalTextureSize = function () {
      var total = 0;
      Object.keys(textureSet).forEach(function (key) {
        total += textureSet[key].stats.size;
      });
      return total
    };
  }

  function restoreTextures () {
    values(textureSet).forEach(function (texture) {
      texture.texture = gl.createTexture();
      gl.bindTexture(texture.target, texture.texture);
      for (var i = 0; i < 32; ++i) {
        if ((texture.mipmask & (1 << i)) === 0) {
          continue
        }
        if (texture.target === GL_TEXTURE_2D$1) {
          gl.texImage2D(GL_TEXTURE_2D$1,
            i,
            texture.internalformat,
            texture.width >> i,
            texture.height >> i,
            0,
            texture.internalformat,
            texture.type,
            null);
        } else {
          for (var j = 0; j < 6; ++j) {
            gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + j,
              i,
              texture.internalformat,
              texture.width >> i,
              texture.height >> i,
              0,
              texture.internalformat,
              texture.type,
              null);
          }
        }
      }
      setTexInfo(texture.texInfo, texture.target);
    });
  }

  return {
    create2D: createTexture2D,
    createCube: createTextureCube,
    clear: destroyTextures,
    getTexture: function (wrapper) {
      return null
    },
    restore: restoreTextures
  }
}

var GL_RENDERBUFFER = 0x8D41;

var GL_RGBA4$1 = 0x8056;
var GL_RGB5_A1$1 = 0x8057;
var GL_RGB565$1 = 0x8D62;
var GL_DEPTH_COMPONENT16 = 0x81A5;
var GL_STENCIL_INDEX8 = 0x8D48;
var GL_DEPTH_STENCIL$1 = 0x84F9;

var GL_SRGB8_ALPHA8_EXT = 0x8C43;

var GL_RGBA32F_EXT = 0x8814;

var GL_RGBA16F_EXT = 0x881A;
var GL_RGB16F_EXT = 0x881B;

var FORMAT_SIZES = [];

FORMAT_SIZES[GL_RGBA4$1] = 2;
FORMAT_SIZES[GL_RGB5_A1$1] = 2;
FORMAT_SIZES[GL_RGB565$1] = 2;

FORMAT_SIZES[GL_DEPTH_COMPONENT16] = 2;
FORMAT_SIZES[GL_STENCIL_INDEX8] = 1;
FORMAT_SIZES[GL_DEPTH_STENCIL$1] = 4;

FORMAT_SIZES[GL_SRGB8_ALPHA8_EXT] = 4;
FORMAT_SIZES[GL_RGBA32F_EXT] = 16;
FORMAT_SIZES[GL_RGBA16F_EXT] = 8;
FORMAT_SIZES[GL_RGB16F_EXT] = 6;

function getRenderbufferSize (format, width, height) {
  return FORMAT_SIZES[format] * width * height
}

var wrapRenderbuffers = function (gl, extensions, limits, stats, config) {
  var formatTypes = {
    'rgba4': GL_RGBA4$1,
    'rgb565': GL_RGB565$1,
    'rgb5 a1': GL_RGB5_A1$1,
    'depth': GL_DEPTH_COMPONENT16,
    'stencil': GL_STENCIL_INDEX8,
    'depth stencil': GL_DEPTH_STENCIL$1
  };

  if (extensions.ext_srgb) {
    formatTypes['srgba'] = GL_SRGB8_ALPHA8_EXT;
  }

  if (extensions.ext_color_buffer_half_float) {
    formatTypes['rgba16f'] = GL_RGBA16F_EXT;
    formatTypes['rgb16f'] = GL_RGB16F_EXT;
  }

  if (extensions.webgl_color_buffer_float) {
    formatTypes['rgba32f'] = GL_RGBA32F_EXT;
  }

  var formatTypesInvert = [];
  Object.keys(formatTypes).forEach(function (key) {
    var val = formatTypes[key];
    formatTypesInvert[val] = key;
  });

  var renderbufferCount = 0;
  var renderbufferSet = {};

  function REGLRenderbuffer (renderbuffer) {
    this.id = renderbufferCount++;
    this.refCount = 1;

    this.renderbuffer = renderbuffer;

    this.format = GL_RGBA4$1;
    this.width = 0;
    this.height = 0;

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  REGLRenderbuffer.prototype.decRef = function () {
    if (--this.refCount <= 0) {
      destroy(this);
    }
  };

  function destroy (rb) {
    var handle = rb.renderbuffer;
    check$1(handle, 'must not double destroy renderbuffer');
    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
    gl.deleteRenderbuffer(handle);
    rb.renderbuffer = null;
    rb.refCount = 0;
    delete renderbufferSet[rb.id];
    stats.renderbufferCount--;
  }

  function createRenderbuffer (a, b) {
    var renderbuffer = new REGLRenderbuffer(gl.createRenderbuffer());
    renderbufferSet[renderbuffer.id] = renderbuffer;
    stats.renderbufferCount++;

    function reglRenderbuffer (a, b) {
      var w = 0;
      var h = 0;
      var format = GL_RGBA4$1;

      if (typeof a === 'object' && a) {
        var options = a;
        if ('shape' in options) {
          var shape = options.shape;
          check$1(Array.isArray(shape) && shape.length >= 2,
            'invalid renderbuffer shape');
          w = shape[0] | 0;
          h = shape[1] | 0;
        } else {
          if ('radius' in options) {
            w = h = options.radius | 0;
          }
          if ('width' in options) {
            w = options.width | 0;
          }
          if ('height' in options) {
            h = options.height | 0;
          }
        }
        if ('format' in options) {
          check$1.parameter(options.format, formatTypes,
            'invalid renderbuffer format');
          format = formatTypes[options.format];
        }
      } else if (typeof a === 'number') {
        w = a | 0;
        if (typeof b === 'number') {
          h = b | 0;
        } else {
          h = w;
        }
      } else if (!a) {
        w = h = 1;
      } else {
        check$1.raise('invalid arguments to renderbuffer constructor');
      }

      // check shape
      check$1(
        w > 0 && h > 0 &&
        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
        'invalid renderbuffer size');

      if (w === renderbuffer.width &&
          h === renderbuffer.height &&
          format === renderbuffer.format) {
        return
      }

      reglRenderbuffer.width = renderbuffer.width = w;
      reglRenderbuffer.height = renderbuffer.height = h;
      renderbuffer.format = format;

      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, format, w, h);

      check$1(
        gl.getError() === 0,
        'invalid render buffer format');

      if (config.profile) {
        renderbuffer.stats.size = getRenderbufferSize(renderbuffer.format, renderbuffer.width, renderbuffer.height);
      }
      reglRenderbuffer.format = formatTypesInvert[renderbuffer.format];

      return reglRenderbuffer
    }

    function resize (w_, h_) {
      var w = w_ | 0;
      var h = (h_ | 0) || w;

      if (w === renderbuffer.width && h === renderbuffer.height) {
        return reglRenderbuffer
      }

      // check shape
      check$1(
        w > 0 && h > 0 &&
        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
        'invalid renderbuffer size');

      reglRenderbuffer.width = renderbuffer.width = w;
      reglRenderbuffer.height = renderbuffer.height = h;

      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, renderbuffer.format, w, h);

      check$1(
        gl.getError() === 0,
        'invalid render buffer format');

      // also, recompute size.
      if (config.profile) {
        renderbuffer.stats.size = getRenderbufferSize(
          renderbuffer.format, renderbuffer.width, renderbuffer.height);
      }

      return reglRenderbuffer
    }

    reglRenderbuffer(a, b);

    reglRenderbuffer.resize = resize;
    reglRenderbuffer._reglType = 'renderbuffer';
    reglRenderbuffer._renderbuffer = renderbuffer;
    if (config.profile) {
      reglRenderbuffer.stats = renderbuffer.stats;
    }
    reglRenderbuffer.destroy = function () {
      renderbuffer.decRef();
    };

    return reglRenderbuffer
  }

  if (config.profile) {
    stats.getTotalRenderbufferSize = function () {
      var total = 0;
      Object.keys(renderbufferSet).forEach(function (key) {
        total += renderbufferSet[key].stats.size;
      });
      return total
    };
  }

  function restoreRenderbuffers () {
    values(renderbufferSet).forEach(function (rb) {
      rb.renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(GL_RENDERBUFFER, rb.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, rb.format, rb.width, rb.height);
    });
    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
  }

  return {
    create: createRenderbuffer,
    clear: function () {
      values(renderbufferSet).forEach(destroy);
    },
    restore: restoreRenderbuffers
  }
};

// We store these constants so that the minifier can inline them
var GL_FRAMEBUFFER$1 = 0x8D40;
var GL_RENDERBUFFER$1 = 0x8D41;

var GL_TEXTURE_2D$2 = 0x0DE1;
var GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 = 0x8515;

var GL_COLOR_ATTACHMENT0$1 = 0x8CE0;
var GL_DEPTH_ATTACHMENT = 0x8D00;
var GL_STENCIL_ATTACHMENT = 0x8D20;
var GL_DEPTH_STENCIL_ATTACHMENT = 0x821A;

var GL_FRAMEBUFFER_COMPLETE$1 = 0x8CD5;
var GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8CD6;
var GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8CD7;
var GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 0x8CD9;
var GL_FRAMEBUFFER_UNSUPPORTED = 0x8CDD;

var GL_HALF_FLOAT_OES$2 = 0x8D61;
var GL_UNSIGNED_BYTE$6 = 0x1401;
var GL_FLOAT$5 = 0x1406;

var GL_RGB$1 = 0x1907;
var GL_RGBA$2 = 0x1908;

var GL_DEPTH_COMPONENT$1 = 0x1902;

var colorTextureFormatEnums = [
  GL_RGB$1,
  GL_RGBA$2
];

// for every texture format, store
// the number of channels
var textureFormatChannels = [];
textureFormatChannels[GL_RGBA$2] = 4;
textureFormatChannels[GL_RGB$1] = 3;

// for every texture type, store
// the size in bytes.
var textureTypeSizes = [];
textureTypeSizes[GL_UNSIGNED_BYTE$6] = 1;
textureTypeSizes[GL_FLOAT$5] = 4;
textureTypeSizes[GL_HALF_FLOAT_OES$2] = 2;

var GL_RGBA4$2 = 0x8056;
var GL_RGB5_A1$2 = 0x8057;
var GL_RGB565$2 = 0x8D62;
var GL_DEPTH_COMPONENT16$1 = 0x81A5;
var GL_STENCIL_INDEX8$1 = 0x8D48;
var GL_DEPTH_STENCIL$2 = 0x84F9;

var GL_SRGB8_ALPHA8_EXT$1 = 0x8C43;

var GL_RGBA32F_EXT$1 = 0x8814;

var GL_RGBA16F_EXT$1 = 0x881A;
var GL_RGB16F_EXT$1 = 0x881B;

var colorRenderbufferFormatEnums = [
  GL_RGBA4$2,
  GL_RGB5_A1$2,
  GL_RGB565$2,
  GL_SRGB8_ALPHA8_EXT$1,
  GL_RGBA16F_EXT$1,
  GL_RGB16F_EXT$1,
  GL_RGBA32F_EXT$1
];

var statusCode = {};
statusCode[GL_FRAMEBUFFER_COMPLETE$1] = 'complete';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT] = 'incomplete attachment';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS] = 'incomplete dimensions';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT] = 'incomplete, missing attachment';
statusCode[GL_FRAMEBUFFER_UNSUPPORTED] = 'unsupported';

function wrapFBOState (
  gl,
  extensions,
  limits,
  textureState,
  renderbufferState,
  stats) {
  var framebufferState = {
    cur: null,
    next: null,
    dirty: false,
    setFBO: null
  };

  var colorTextureFormats = ['rgba'];
  var colorRenderbufferFormats = ['rgba4', 'rgb565', 'rgb5 a1'];

  if (extensions.ext_srgb) {
    colorRenderbufferFormats.push('srgba');
  }

  if (extensions.ext_color_buffer_half_float) {
    colorRenderbufferFormats.push('rgba16f', 'rgb16f');
  }

  if (extensions.webgl_color_buffer_float) {
    colorRenderbufferFormats.push('rgba32f');
  }

  var colorTypes = ['uint8'];
  if (extensions.oes_texture_half_float) {
    colorTypes.push('half float', 'float16');
  }
  if (extensions.oes_texture_float) {
    colorTypes.push('float', 'float32');
  }

  function FramebufferAttachment (target, texture, renderbuffer) {
    this.target = target;
    this.texture = texture;
    this.renderbuffer = renderbuffer;

    var w = 0;
    var h = 0;
    if (texture) {
      w = texture.width;
      h = texture.height;
    } else if (renderbuffer) {
      w = renderbuffer.width;
      h = renderbuffer.height;
    }
    this.width = w;
    this.height = h;
  }

  function decRef (attachment) {
    if (attachment) {
      if (attachment.texture) {
        attachment.texture._texture.decRef();
      }
      if (attachment.renderbuffer) {
        attachment.renderbuffer._renderbuffer.decRef();
      }
    }
  }

  function incRefAndCheckShape (attachment, width, height) {
    if (!attachment) {
      return
    }
    if (attachment.texture) {
      var texture = attachment.texture._texture;
      var tw = Math.max(1, texture.width);
      var th = Math.max(1, texture.height);
      check$1(tw === width && th === height,
        'inconsistent width/height for supplied texture');
      texture.refCount += 1;
    } else {
      var renderbuffer = attachment.renderbuffer._renderbuffer;
      check$1(
        renderbuffer.width === width && renderbuffer.height === height,
        'inconsistent width/height for renderbuffer');
      renderbuffer.refCount += 1;
    }
  }

  function attach (location, attachment) {
    if (attachment) {
      if (attachment.texture) {
        gl.framebufferTexture2D(
          GL_FRAMEBUFFER$1,
          location,
          attachment.target,
          attachment.texture._texture.texture,
          0);
      } else {
        gl.framebufferRenderbuffer(
          GL_FRAMEBUFFER$1,
          location,
          GL_RENDERBUFFER$1,
          attachment.renderbuffer._renderbuffer.renderbuffer);
      }
    }
  }

  function parseAttachment (attachment) {
    var target = GL_TEXTURE_2D$2;
    var texture = null;
    var renderbuffer = null;

    var data = attachment;
    if (typeof attachment === 'object') {
      data = attachment.data;
      if ('target' in attachment) {
        target = attachment.target | 0;
      }
    }

    check$1.type(data, 'function', 'invalid attachment data');

    var type = data._reglType;
    if (type === 'texture2d') {
      texture = data;
      check$1(target === GL_TEXTURE_2D$2);
    } else if (type === 'textureCube') {
      texture = data;
      check$1(
        target >= GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 &&
        target < GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 + 6,
        'invalid cube map target');
    } else if (type === 'renderbuffer') {
      renderbuffer = data;
      target = GL_RENDERBUFFER$1;
    } else {
      check$1.raise('invalid regl object for attachment');
    }

    return new FramebufferAttachment(target, texture, renderbuffer)
  }

  function allocAttachment (
    width,
    height,
    isTexture,
    format,
    type) {
    if (isTexture) {
      var texture = textureState.create2D({
        width: width,
        height: height,
        format: format,
        type: type
      });
      texture._texture.refCount = 0;
      return new FramebufferAttachment(GL_TEXTURE_2D$2, texture, null)
    } else {
      var rb = renderbufferState.create({
        width: width,
        height: height,
        format: format
      });
      rb._renderbuffer.refCount = 0;
      return new FramebufferAttachment(GL_RENDERBUFFER$1, null, rb)
    }
  }

  function unwrapAttachment (attachment) {
    return attachment && (attachment.texture || attachment.renderbuffer)
  }

  function resizeAttachment (attachment, w, h) {
    if (attachment) {
      if (attachment.texture) {
        attachment.texture.resize(w, h);
      } else if (attachment.renderbuffer) {
        attachment.renderbuffer.resize(w, h);
      }
    }
  }

  var framebufferCount = 0;
  var framebufferSet = {};

  function REGLFramebuffer () {
    this.id = framebufferCount++;
    framebufferSet[this.id] = this;

    this.framebuffer = gl.createFramebuffer();
    this.width = 0;
    this.height = 0;

    this.colorAttachments = [];
    this.depthAttachment = null;
    this.stencilAttachment = null;
    this.depthStencilAttachment = null;
  }

  function decFBORefs (framebuffer) {
    framebuffer.colorAttachments.forEach(decRef);
    decRef(framebuffer.depthAttachment);
    decRef(framebuffer.stencilAttachment);
    decRef(framebuffer.depthStencilAttachment);
  }

  function destroy (framebuffer) {
    var handle = framebuffer.framebuffer;
    check$1(handle, 'must not double destroy framebuffer');
    gl.deleteFramebuffer(handle);
    framebuffer.framebuffer = null;
    stats.framebufferCount--;
    delete framebufferSet[framebuffer.id];
  }

  function updateFramebuffer (framebuffer) {
    var i;

    gl.bindFramebuffer(GL_FRAMEBUFFER$1, framebuffer.framebuffer);
    var colorAttachments = framebuffer.colorAttachments;
    for (i = 0; i < colorAttachments.length; ++i) {
      attach(GL_COLOR_ATTACHMENT0$1 + i, colorAttachments[i]);
    }
    for (i = colorAttachments.length; i < limits.maxColorAttachments; ++i) {
      gl.framebufferTexture2D(
        GL_FRAMEBUFFER$1,
        GL_COLOR_ATTACHMENT0$1 + i,
        GL_TEXTURE_2D$2,
        null,
        0);
    }

    gl.framebufferTexture2D(
      GL_FRAMEBUFFER$1,
      GL_DEPTH_STENCIL_ATTACHMENT,
      GL_TEXTURE_2D$2,
      null,
      0);
    gl.framebufferTexture2D(
      GL_FRAMEBUFFER$1,
      GL_DEPTH_ATTACHMENT,
      GL_TEXTURE_2D$2,
      null,
      0);
    gl.framebufferTexture2D(
      GL_FRAMEBUFFER$1,
      GL_STENCIL_ATTACHMENT,
      GL_TEXTURE_2D$2,
      null,
      0);

    attach(GL_DEPTH_ATTACHMENT, framebuffer.depthAttachment);
    attach(GL_STENCIL_ATTACHMENT, framebuffer.stencilAttachment);
    attach(GL_DEPTH_STENCIL_ATTACHMENT, framebuffer.depthStencilAttachment);

    // Check status code
    var status = gl.checkFramebufferStatus(GL_FRAMEBUFFER$1);
    if (status !== GL_FRAMEBUFFER_COMPLETE$1) {
      check$1.raise('framebuffer configuration not supported, status = ' +
        statusCode[status]);
    }


    gl.bindFramebuffer(GL_FRAMEBUFFER$1, framebufferState.next ? framebufferState.next.framebuffer : null);
    framebufferState.cur = framebufferState.next;

    // FIXME: Clear error code here.  This is a work around for a bug in
    // headless-gl
    gl.getError();
  }

  function createFBO (a0, a1) {
    var framebuffer = new REGLFramebuffer();
    stats.framebufferCount++;

    function reglFramebuffer (a, b) {
      var i;

      check$1(framebufferState.next !== framebuffer,
        'can not update framebuffer which is currently in use');

      var extDrawBuffers = extensions.webgl_draw_buffers;

      var width = 0;
      var height = 0;

      var needsDepth = true;
      var needsStencil = true;

      var colorBuffer = null;
      var colorTexture = true;
      var colorFormat = 'rgba';
      var colorType = 'uint8';
      var colorCount = 1;

      var depthBuffer = null;
      var stencilBuffer = null;
      var depthStencilBuffer = null;
      var depthStencilTexture = false;

      if (typeof a === 'number') {
        width = a | 0;
        height = (b | 0) || width;
      } else if (!a) {
        width = height = 1;
      } else {
        check$1.type(a, 'object', 'invalid arguments for framebuffer');
        var options = a;

        if ('shape' in options) {
          var shape = options.shape;
          check$1(Array.isArray(shape) && shape.length >= 2,
            'invalid shape for framebuffer');
          width = shape[0];
          height = shape[1];
        } else {
          if ('radius' in options) {
            width = height = options.radius;
          }
          if ('width' in options) {
            width = options.width;
          }
          if ('height' in options) {
            height = options.height;
          }
        }

        if ('color' in options ||
            'colors' in options) {
          colorBuffer =
            options.color ||
            options.colors;
          if (Array.isArray(colorBuffer)) {
            check$1(
              colorBuffer.length === 1 || extDrawBuffers,
              'multiple render targets not supported');
          }
        }

        if (!colorBuffer) {
          if ('colorCount' in options) {
            colorCount = options.colorCount | 0;
            check$1(colorCount > 0, 'invalid color buffer count');
          }

          if ('colorTexture' in options) {
            colorTexture = !!options.colorTexture;
            colorFormat = 'rgba4';
          }

          if ('colorType' in options) {
            colorType = options.colorType;
            if (!colorTexture) {
              if (colorType === 'half float' || colorType === 'float16') {
                check$1(extensions.ext_color_buffer_half_float,
                  'you must enable EXT_color_buffer_half_float to use 16-bit render buffers');
                colorFormat = 'rgba16f';
              } else if (colorType === 'float' || colorType === 'float32') {
                check$1(extensions.webgl_color_buffer_float,
                  'you must enable WEBGL_color_buffer_float in order to use 32-bit floating point renderbuffers');
                colorFormat = 'rgba32f';
              }
            } else {
              check$1(extensions.oes_texture_float ||
                !(colorType === 'float' || colorType === 'float32'),
                'you must enable OES_texture_float in order to use floating point framebuffer objects');
              check$1(extensions.oes_texture_half_float ||
                !(colorType === 'half float' || colorType === 'float16'),
                'you must enable OES_texture_half_float in order to use 16-bit floating point framebuffer objects');
            }
            check$1.oneOf(colorType, colorTypes, 'invalid color type');
          }

          if ('colorFormat' in options) {
            colorFormat = options.colorFormat;
            if (colorTextureFormats.indexOf(colorFormat) >= 0) {
              colorTexture = true;
            } else if (colorRenderbufferFormats.indexOf(colorFormat) >= 0) {
              colorTexture = false;
            } else {
              if (colorTexture) {
                check$1.oneOf(
                  options.colorFormat, colorTextureFormats,
                  'invalid color format for texture');
              } else {
                check$1.oneOf(
                  options.colorFormat, colorRenderbufferFormats,
                  'invalid color format for renderbuffer');
              }
            }
          }
        }

        if ('depthTexture' in options || 'depthStencilTexture' in options) {
          depthStencilTexture = !!(options.depthTexture ||
            options.depthStencilTexture);
          check$1(!depthStencilTexture || extensions.webgl_depth_texture,
            'webgl_depth_texture extension not supported');
        }

        if ('depth' in options) {
          if (typeof options.depth === 'boolean') {
            needsDepth = options.depth;
          } else {
            depthBuffer = options.depth;
            needsStencil = false;
          }
        }

        if ('stencil' in options) {
          if (typeof options.stencil === 'boolean') {
            needsStencil = options.stencil;
          } else {
            stencilBuffer = options.stencil;
            needsDepth = false;
          }
        }

        if ('depthStencil' in options) {
          if (typeof options.depthStencil === 'boolean') {
            needsDepth = needsStencil = options.depthStencil;
          } else {
            depthStencilBuffer = options.depthStencil;
            needsDepth = false;
            needsStencil = false;
          }
        }
      }

      // parse attachments
      var colorAttachments = null;
      var depthAttachment = null;
      var stencilAttachment = null;
      var depthStencilAttachment = null;

      // Set up color attachments
      if (Array.isArray(colorBuffer)) {
        colorAttachments = colorBuffer.map(parseAttachment);
      } else if (colorBuffer) {
        colorAttachments = [parseAttachment(colorBuffer)];
      } else {
        colorAttachments = new Array(colorCount);
        for (i = 0; i < colorCount; ++i) {
          colorAttachments[i] = allocAttachment(
            width,
            height,
            colorTexture,
            colorFormat,
            colorType);
        }
      }

      check$1(extensions.webgl_draw_buffers || colorAttachments.length <= 1,
        'you must enable the WEBGL_draw_buffers extension in order to use multiple color buffers.');
      check$1(colorAttachments.length <= limits.maxColorAttachments,
        'too many color attachments, not supported');

      width = width || colorAttachments[0].width;
      height = height || colorAttachments[0].height;

      if (depthBuffer) {
        depthAttachment = parseAttachment(depthBuffer);
      } else if (needsDepth && !needsStencil) {
        depthAttachment = allocAttachment(
          width,
          height,
          depthStencilTexture,
          'depth',
          'uint32');
      }

      if (stencilBuffer) {
        stencilAttachment = parseAttachment(stencilBuffer);
      } else if (needsStencil && !needsDepth) {
        stencilAttachment = allocAttachment(
          width,
          height,
          false,
          'stencil',
          'uint8');
      }

      if (depthStencilBuffer) {
        depthStencilAttachment = parseAttachment(depthStencilBuffer);
      } else if (!depthBuffer && !stencilBuffer && needsStencil && needsDepth) {
        depthStencilAttachment = allocAttachment(
          width,
          height,
          depthStencilTexture,
          'depth stencil',
          'depth stencil');
      }

      check$1(
        (!!depthBuffer) + (!!stencilBuffer) + (!!depthStencilBuffer) <= 1,
        'invalid framebuffer configuration, can specify exactly one depth/stencil attachment');

      var commonColorAttachmentSize = null;

      for (i = 0; i < colorAttachments.length; ++i) {
        incRefAndCheckShape(colorAttachments[i], width, height);
        check$1(!colorAttachments[i] ||
          (colorAttachments[i].texture &&
            colorTextureFormatEnums.indexOf(colorAttachments[i].texture._texture.format) >= 0) ||
          (colorAttachments[i].renderbuffer &&
            colorRenderbufferFormatEnums.indexOf(colorAttachments[i].renderbuffer._renderbuffer.format) >= 0),
          'framebuffer color attachment ' + i + ' is invalid');

        if (colorAttachments[i] && colorAttachments[i].texture) {
          var colorAttachmentSize =
              textureFormatChannels[colorAttachments[i].texture._texture.format] *
              textureTypeSizes[colorAttachments[i].texture._texture.type];

          if (commonColorAttachmentSize === null) {
            commonColorAttachmentSize = colorAttachmentSize;
          } else {
            // We need to make sure that all color attachments have the same number of bitplanes
            // (that is, the same numer of bits per pixel)
            // This is required by the GLES2.0 standard. See the beginning of Chapter 4 in that document.
            check$1(commonColorAttachmentSize === colorAttachmentSize,
                  'all color attachments much have the same number of bits per pixel.');
          }
        }
      }
      incRefAndCheckShape(depthAttachment, width, height);
      check$1(!depthAttachment ||
        (depthAttachment.texture &&
          depthAttachment.texture._texture.format === GL_DEPTH_COMPONENT$1) ||
        (depthAttachment.renderbuffer &&
          depthAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_COMPONENT16$1),
        'invalid depth attachment for framebuffer object');
      incRefAndCheckShape(stencilAttachment, width, height);
      check$1(!stencilAttachment ||
        (stencilAttachment.renderbuffer &&
          stencilAttachment.renderbuffer._renderbuffer.format === GL_STENCIL_INDEX8$1),
        'invalid stencil attachment for framebuffer object');
      incRefAndCheckShape(depthStencilAttachment, width, height);
      check$1(!depthStencilAttachment ||
        (depthStencilAttachment.texture &&
          depthStencilAttachment.texture._texture.format === GL_DEPTH_STENCIL$2) ||
        (depthStencilAttachment.renderbuffer &&
          depthStencilAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_STENCIL$2),
        'invalid depth-stencil attachment for framebuffer object');

      // decrement references
      decFBORefs(framebuffer);

      framebuffer.width = width;
      framebuffer.height = height;

      framebuffer.colorAttachments = colorAttachments;
      framebuffer.depthAttachment = depthAttachment;
      framebuffer.stencilAttachment = stencilAttachment;
      framebuffer.depthStencilAttachment = depthStencilAttachment;

      reglFramebuffer.color = colorAttachments.map(unwrapAttachment);
      reglFramebuffer.depth = unwrapAttachment(depthAttachment);
      reglFramebuffer.stencil = unwrapAttachment(stencilAttachment);
      reglFramebuffer.depthStencil = unwrapAttachment(depthStencilAttachment);

      reglFramebuffer.width = framebuffer.width;
      reglFramebuffer.height = framebuffer.height;

      updateFramebuffer(framebuffer);

      return reglFramebuffer
    }

    function resize (w_, h_) {
      check$1(framebufferState.next !== framebuffer,
        'can not resize a framebuffer which is currently in use');

      var w = w_ | 0;
      var h = (h_ | 0) || w;
      if (w === framebuffer.width && h === framebuffer.height) {
        return reglFramebuffer
      }

      // resize all buffers
      var colorAttachments = framebuffer.colorAttachments;
      for (var i = 0; i < colorAttachments.length; ++i) {
        resizeAttachment(colorAttachments[i], w, h);
      }
      resizeAttachment(framebuffer.depthAttachment, w, h);
      resizeAttachment(framebuffer.stencilAttachment, w, h);
      resizeAttachment(framebuffer.depthStencilAttachment, w, h);

      framebuffer.width = reglFramebuffer.width = w;
      framebuffer.height = reglFramebuffer.height = h;

      updateFramebuffer(framebuffer);

      return reglFramebuffer
    }

    reglFramebuffer(a0, a1);

    return extend(reglFramebuffer, {
      resize: resize,
      _reglType: 'framebuffer',
      _framebuffer: framebuffer,
      destroy: function () {
        destroy(framebuffer);
        decFBORefs(framebuffer);
      },
      use: function (block) {
        framebufferState.setFBO({
          framebuffer: reglFramebuffer
        }, block);
      }
    })
  }

  function createCubeFBO (options) {
    var faces = Array(6);

    function reglFramebufferCube (a) {
      var i;

      check$1(faces.indexOf(framebufferState.next) < 0,
        'can not update framebuffer which is currently in use');

      var extDrawBuffers = extensions.webgl_draw_buffers;

      var params = {
        color: null
      };

      var radius = 0;

      var colorBuffer = null;
      var colorFormat = 'rgba';
      var colorType = 'uint8';
      var colorCount = 1;

      if (typeof a === 'number') {
        radius = a | 0;
      } else if (!a) {
        radius = 1;
      } else {
        check$1.type(a, 'object', 'invalid arguments for framebuffer');
        var options = a;

        if ('shape' in options) {
          var shape = options.shape;
          check$1(
            Array.isArray(shape) && shape.length >= 2,
            'invalid shape for framebuffer');
          check$1(
            shape[0] === shape[1],
            'cube framebuffer must be square');
          radius = shape[0];
        } else {
          if ('radius' in options) {
            radius = options.radius | 0;
          }
          if ('width' in options) {
            radius = options.width | 0;
            if ('height' in options) {
              check$1(options.height === radius, 'must be square');
            }
          } else if ('height' in options) {
            radius = options.height | 0;
          }
        }

        if ('color' in options ||
            'colors' in options) {
          colorBuffer =
            options.color ||
            options.colors;
          if (Array.isArray(colorBuffer)) {
            check$1(
              colorBuffer.length === 1 || extDrawBuffers,
              'multiple render targets not supported');
          }
        }

        if (!colorBuffer) {
          if ('colorCount' in options) {
            colorCount = options.colorCount | 0;
            check$1(colorCount > 0, 'invalid color buffer count');
          }

          if ('colorType' in options) {
            check$1.oneOf(
              options.colorType, colorTypes,
              'invalid color type');
            colorType = options.colorType;
          }

          if ('colorFormat' in options) {
            colorFormat = options.colorFormat;
            check$1.oneOf(
              options.colorFormat, colorTextureFormats,
              'invalid color format for texture');
          }
        }

        if ('depth' in options) {
          params.depth = options.depth;
        }

        if ('stencil' in options) {
          params.stencil = options.stencil;
        }

        if ('depthStencil' in options) {
          params.depthStencil = options.depthStencil;
        }
      }

      var colorCubes;
      if (colorBuffer) {
        if (Array.isArray(colorBuffer)) {
          colorCubes = [];
          for (i = 0; i < colorBuffer.length; ++i) {
            colorCubes[i] = colorBuffer[i];
          }
        } else {
          colorCubes = [ colorBuffer ];
        }
      } else {
        colorCubes = Array(colorCount);
        var cubeMapParams = {
          radius: radius,
          format: colorFormat,
          type: colorType
        };
        for (i = 0; i < colorCount; ++i) {
          colorCubes[i] = textureState.createCube(cubeMapParams);
        }
      }

      // Check color cubes
      params.color = Array(colorCubes.length);
      for (i = 0; i < colorCubes.length; ++i) {
        var cube = colorCubes[i];
        check$1(
          typeof cube === 'function' && cube._reglType === 'textureCube',
          'invalid cube map');
        radius = radius || cube.width;
        check$1(
          cube.width === radius && cube.height === radius,
          'invalid cube map shape');
        params.color[i] = {
          target: GL_TEXTURE_CUBE_MAP_POSITIVE_X$2,
          data: colorCubes[i]
        };
      }

      for (i = 0; i < 6; ++i) {
        for (var j = 0; j < colorCubes.length; ++j) {
          params.color[j].target = GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 + i;
        }
        // reuse depth-stencil attachments across all cube maps
        if (i > 0) {
          params.depth = faces[0].depth;
          params.stencil = faces[0].stencil;
          params.depthStencil = faces[0].depthStencil;
        }
        if (faces[i]) {
          (faces[i])(params);
        } else {
          faces[i] = createFBO(params);
        }
      }

      return extend(reglFramebufferCube, {
        width: radius,
        height: radius,
        color: colorCubes
      })
    }

    function resize (radius_) {
      var i;
      var radius = radius_ | 0;
      check$1(radius > 0 && radius <= limits.maxCubeMapSize,
        'invalid radius for cube fbo');

      if (radius === reglFramebufferCube.width) {
        return reglFramebufferCube
      }

      var colors = reglFramebufferCube.color;
      for (i = 0; i < colors.length; ++i) {
        colors[i].resize(radius);
      }

      for (i = 0; i < 6; ++i) {
        faces[i].resize(radius);
      }

      reglFramebufferCube.width = reglFramebufferCube.height = radius;

      return reglFramebufferCube
    }

    reglFramebufferCube(options);

    return extend(reglFramebufferCube, {
      faces: faces,
      resize: resize,
      _reglType: 'framebufferCube',
      destroy: function () {
        faces.forEach(function (f) {
          f.destroy();
        });
      }
    })
  }

  function restoreFramebuffers () {
    values(framebufferSet).forEach(function (fb) {
      fb.framebuffer = gl.createFramebuffer();
      updateFramebuffer(fb);
    });
  }

  return extend(framebufferState, {
    getFramebuffer: function (object) {
      if (typeof object === 'function' && object._reglType === 'framebuffer') {
        var fbo = object._framebuffer;
        if (fbo instanceof REGLFramebuffer) {
          return fbo
        }
      }
      return null
    },
    create: createFBO,
    createCube: createCubeFBO,
    clear: function () {
      values(framebufferSet).forEach(destroy);
    },
    restore: restoreFramebuffers
  })
}

var GL_FLOAT$6 = 5126;

function AttributeRecord () {
  this.state = 0;

  this.x = 0.0;
  this.y = 0.0;
  this.z = 0.0;
  this.w = 0.0;

  this.buffer = null;
  this.size = 0;
  this.normalized = false;
  this.type = GL_FLOAT$6;
  this.offset = 0;
  this.stride = 0;
  this.divisor = 0;
}

function wrapAttributeState (
  gl,
  extensions,
  limits,
  stringStore) {
  var NUM_ATTRIBUTES = limits.maxAttributes;
  var attributeBindings = new Array(NUM_ATTRIBUTES);
  for (var i = 0; i < NUM_ATTRIBUTES; ++i) {
    attributeBindings[i] = new AttributeRecord();
  }

  return {
    Record: AttributeRecord,
    scope: {},
    state: attributeBindings
  }
}

var GL_FRAGMENT_SHADER = 35632;
var GL_VERTEX_SHADER = 35633;

var GL_ACTIVE_UNIFORMS = 0x8B86;
var GL_ACTIVE_ATTRIBUTES = 0x8B89;

function wrapShaderState (gl, stringStore, stats, config) {
  // ===================================================
  // glsl compilation and linking
  // ===================================================
  var fragShaders = {};
  var vertShaders = {};

  function ActiveInfo (name, id, location, info) {
    this.name = name;
    this.id = id;
    this.location = location;
    this.info = info;
  }

  function insertActiveInfo (list, info) {
    for (var i = 0; i < list.length; ++i) {
      if (list[i].id === info.id) {
        list[i].location = info.location;
        return
      }
    }
    list.push(info);
  }

  function getShader (type, id, command) {
    var cache = type === GL_FRAGMENT_SHADER ? fragShaders : vertShaders;
    var shader = cache[id];

    if (!shader) {
      var source = stringStore.str(id);
      shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      check$1.shaderError(gl, shader, source, type, command);
      cache[id] = shader;
    }

    return shader
  }

  // ===================================================
  // program linking
  // ===================================================
  var programCache = {};
  var programList = [];

  var PROGRAM_COUNTER = 0;

  function REGLProgram (fragId, vertId) {
    this.id = PROGRAM_COUNTER++;
    this.fragId = fragId;
    this.vertId = vertId;
    this.program = null;
    this.uniforms = [];
    this.attributes = [];

    if (config.profile) {
      this.stats = {
        uniformsCount: 0,
        attributesCount: 0
      };
    }
  }

  function linkProgram (desc, command) {
    var i, info;

    // -------------------------------
    // compile & link
    // -------------------------------
    var fragShader = getShader(GL_FRAGMENT_SHADER, desc.fragId);
    var vertShader = getShader(GL_VERTEX_SHADER, desc.vertId);

    var program = desc.program = gl.createProgram();
    gl.attachShader(program, fragShader);
    gl.attachShader(program, vertShader);
    gl.linkProgram(program);
    check$1.linkError(
      gl,
      program,
      stringStore.str(desc.fragId),
      stringStore.str(desc.vertId),
      command);

    // -------------------------------
    // grab uniforms
    // -------------------------------
    var numUniforms = gl.getProgramParameter(program, GL_ACTIVE_UNIFORMS);
    if (config.profile) {
      desc.stats.uniformsCount = numUniforms;
    }
    var uniforms = desc.uniforms;
    for (i = 0; i < numUniforms; ++i) {
      info = gl.getActiveUniform(program, i);
      if (info) {
        if (info.size > 1) {
          for (var j = 0; j < info.size; ++j) {
            var name = info.name.replace('[0]', '[' + j + ']');
            insertActiveInfo(uniforms, new ActiveInfo(
              name,
              stringStore.id(name),
              gl.getUniformLocation(program, name),
              info));
          }
        } else {
          insertActiveInfo(uniforms, new ActiveInfo(
            info.name,
            stringStore.id(info.name),
            gl.getUniformLocation(program, info.name),
            info));
        }
      }
    }

    // -------------------------------
    // grab attributes
    // -------------------------------
    var numAttributes = gl.getProgramParameter(program, GL_ACTIVE_ATTRIBUTES);
    if (config.profile) {
      desc.stats.attributesCount = numAttributes;
    }

    var attributes = desc.attributes;
    for (i = 0; i < numAttributes; ++i) {
      info = gl.getActiveAttrib(program, i);
      if (info) {
        insertActiveInfo(attributes, new ActiveInfo(
          info.name,
          stringStore.id(info.name),
          gl.getAttribLocation(program, info.name),
          info));
      }
    }
  }

  if (config.profile) {
    stats.getMaxUniformsCount = function () {
      var m = 0;
      programList.forEach(function (desc) {
        if (desc.stats.uniformsCount > m) {
          m = desc.stats.uniformsCount;
        }
      });
      return m
    };

    stats.getMaxAttributesCount = function () {
      var m = 0;
      programList.forEach(function (desc) {
        if (desc.stats.attributesCount > m) {
          m = desc.stats.attributesCount;
        }
      });
      return m
    };
  }

  function restoreShaders () {
    fragShaders = {};
    vertShaders = {};
    for (var i = 0; i < programList.length; ++i) {
      linkProgram(programList[i]);
    }
  }

  return {
    clear: function () {
      var deleteShader = gl.deleteShader.bind(gl);
      values(fragShaders).forEach(deleteShader);
      fragShaders = {};
      values(vertShaders).forEach(deleteShader);
      vertShaders = {};

      programList.forEach(function (desc) {
        gl.deleteProgram(desc.program);
      });
      programList.length = 0;
      programCache = {};

      stats.shaderCount = 0;
    },

    program: function (vertId, fragId, command) {
      check$1.command(vertId >= 0, 'missing vertex shader', command);
      check$1.command(fragId >= 0, 'missing fragment shader', command);

      var cache = programCache[fragId];
      if (!cache) {
        cache = programCache[fragId] = {};
      }
      var program = cache[vertId];
      if (!program) {
        program = new REGLProgram(fragId, vertId);
        stats.shaderCount++;

        linkProgram(program, command);
        cache[vertId] = program;
        programList.push(program);
      }
      return program
    },

    restore: restoreShaders,

    shader: getShader,

    frag: -1,
    vert: -1
  }
}

var GL_RGBA$3 = 6408;
var GL_UNSIGNED_BYTE$7 = 5121;
var GL_PACK_ALIGNMENT = 0x0D05;
var GL_FLOAT$7 = 0x1406; // 5126

function wrapReadPixels (
  gl,
  framebufferState,
  reglPoll,
  context,
  glAttributes,
  extensions,
  limits) {
  function readPixelsImpl (input) {
    var type;
    if (framebufferState.next === null) {
      check$1(
        glAttributes.preserveDrawingBuffer,
        'you must create a webgl context with "preserveDrawingBuffer":true in order to read pixels from the drawing buffer');
      type = GL_UNSIGNED_BYTE$7;
    } else {
      check$1(
        framebufferState.next.colorAttachments[0].texture !== null,
          'You cannot read from a renderbuffer');
      type = framebufferState.next.colorAttachments[0].texture._texture.type;

      if (extensions.oes_texture_float) {
        check$1(
          type === GL_UNSIGNED_BYTE$7 || type === GL_FLOAT$7,
          'Reading from a framebuffer is only allowed for the types \'uint8\' and \'float\'');

        if (type === GL_FLOAT$7) {
          check$1(limits.readFloat, 'Reading \'float\' values is not permitted in your browser. For a fallback, please see: https://www.npmjs.com/package/glsl-read-float');
        }
      } else {
        check$1(
          type === GL_UNSIGNED_BYTE$7,
          'Reading from a framebuffer is only allowed for the type \'uint8\'');
      }
    }

    var x = 0;
    var y = 0;
    var width = context.framebufferWidth;
    var height = context.framebufferHeight;
    var data = null;

    if (isTypedArray(input)) {
      data = input;
    } else if (input) {
      check$1.type(input, 'object', 'invalid arguments to regl.read()');
      x = input.x | 0;
      y = input.y | 0;
      check$1(
        x >= 0 && x < context.framebufferWidth,
        'invalid x offset for regl.read');
      check$1(
        y >= 0 && y < context.framebufferHeight,
        'invalid y offset for regl.read');
      width = (input.width || (context.framebufferWidth - x)) | 0;
      height = (input.height || (context.framebufferHeight - y)) | 0;
      data = input.data || null;
    }

    // sanity check input.data
    if (data) {
      if (type === GL_UNSIGNED_BYTE$7) {
        check$1(
          data instanceof Uint8Array,
          'buffer must be \'Uint8Array\' when reading from a framebuffer of type \'uint8\'');
      } else if (type === GL_FLOAT$7) {
        check$1(
          data instanceof Float32Array,
          'buffer must be \'Float32Array\' when reading from a framebuffer of type \'float\'');
      }
    }

    check$1(
      width > 0 && width + x <= context.framebufferWidth,
      'invalid width for read pixels');
    check$1(
      height > 0 && height + y <= context.framebufferHeight,
      'invalid height for read pixels');

    // Update WebGL state
    reglPoll();

    // Compute size
    var size = width * height * 4;

    // Allocate data
    if (!data) {
      if (type === GL_UNSIGNED_BYTE$7) {
        data = new Uint8Array(size);
      } else if (type === GL_FLOAT$7) {
        data = data || new Float32Array(size);
      }
    }

    // Type check
    check$1.isTypedArray(data, 'data buffer for regl.read() must be a typedarray');
    check$1(data.byteLength >= size, 'data buffer for regl.read() too small');

    // Run read pixels
    gl.pixelStorei(GL_PACK_ALIGNMENT, 4);
    gl.readPixels(x, y, width, height, GL_RGBA$3,
                  type,
                  data);

    return data
  }

  function readPixelsFBO (options) {
    var result;
    framebufferState.setFBO({
      framebuffer: options.framebuffer
    }, function () {
      result = readPixelsImpl(options);
    });
    return result
  }

  function readPixels (options) {
    if (!options || !('framebuffer' in options)) {
      return readPixelsImpl(options)
    } else {
      return readPixelsFBO(options)
    }
  }

  return readPixels
}

function slice (x) {
  return Array.prototype.slice.call(x)
}

function join (x) {
  return slice(x).join('')
}

function createEnvironment () {
  // Unique variable id counter
  var varCounter = 0;

  // Linked values are passed from this scope into the generated code block
  // Calling link() passes a value into the generated scope and returns
  // the variable name which it is bound to
  var linkedNames = [];
  var linkedValues = [];
  function link (value) {
    for (var i = 0; i < linkedValues.length; ++i) {
      if (linkedValues[i] === value) {
        return linkedNames[i]
      }
    }

    var name = 'g' + (varCounter++);
    linkedNames.push(name);
    linkedValues.push(value);
    return name
  }

  // create a code block
  function block () {
    var code = [];
    function push () {
      code.push.apply(code, slice(arguments));
    }

    var vars = [];
    function def () {
      var name = 'v' + (varCounter++);
      vars.push(name);

      if (arguments.length > 0) {
        code.push(name, '=');
        code.push.apply(code, slice(arguments));
        code.push(';');
      }

      return name
    }

    return extend(push, {
      def: def,
      toString: function () {
        return join([
          (vars.length > 0 ? 'var ' + vars + ';' : ''),
          join(code)
        ])
      }
    })
  }

  function scope () {
    var entry = block();
    var exit = block();

    var entryToString = entry.toString;
    var exitToString = exit.toString;

    function save (object, prop) {
      exit(object, prop, '=', entry.def(object, prop), ';');
    }

    return extend(function () {
      entry.apply(entry, slice(arguments));
    }, {
      def: entry.def,
      entry: entry,
      exit: exit,
      save: save,
      set: function (object, prop, value) {
        save(object, prop);
        entry(object, prop, '=', value, ';');
      },
      toString: function () {
        return entryToString() + exitToString()
      }
    })
  }

  function conditional () {
    var pred = join(arguments);
    var thenBlock = scope();
    var elseBlock = scope();

    var thenToString = thenBlock.toString;
    var elseToString = elseBlock.toString;

    return extend(thenBlock, {
      then: function () {
        thenBlock.apply(thenBlock, slice(arguments));
        return this
      },
      else: function () {
        elseBlock.apply(elseBlock, slice(arguments));
        return this
      },
      toString: function () {
        var elseClause = elseToString();
        if (elseClause) {
          elseClause = 'else{' + elseClause + '}';
        }
        return join([
          'if(', pred, '){',
          thenToString(),
          '}', elseClause
        ])
      }
    })
  }

  // procedure list
  var globalBlock = block();
  var procedures = {};
  function proc (name, count) {
    var args = [];
    function arg () {
      var name = 'a' + args.length;
      args.push(name);
      return name
    }

    count = count || 0;
    for (var i = 0; i < count; ++i) {
      arg();
    }

    var body = scope();
    var bodyToString = body.toString;

    var result = procedures[name] = extend(body, {
      arg: arg,
      toString: function () {
        return join([
          'function(', args.join(), '){',
          bodyToString(),
          '}'
        ])
      }
    });

    return result
  }

  function compile () {
    var code = ['"use strict";',
      globalBlock,
      'return {'];
    Object.keys(procedures).forEach(function (name) {
      code.push('"', name, '":', procedures[name].toString(), ',');
    });
    code.push('}');
    var src = join(code)
      .replace(/;/g, ';\n')
      .replace(/}/g, '}\n')
      .replace(/{/g, '{\n');
    var proc = Function.apply(null, linkedNames.concat(src));
    return proc.apply(null, linkedValues)
  }

  return {
    global: globalBlock,
    link: link,
    block: block,
    proc: proc,
    scope: scope,
    cond: conditional,
    compile: compile
  }
}

// "cute" names for vector components
var CUTE_COMPONENTS = 'xyzw'.split('');

var GL_UNSIGNED_BYTE$8 = 5121;

var ATTRIB_STATE_POINTER = 1;
var ATTRIB_STATE_CONSTANT = 2;

var DYN_FUNC$1 = 0;
var DYN_PROP$1 = 1;
var DYN_CONTEXT$1 = 2;
var DYN_STATE$1 = 3;
var DYN_THUNK = 4;

var S_DITHER = 'dither';
var S_BLEND_ENABLE = 'blend.enable';
var S_BLEND_COLOR = 'blend.color';
var S_BLEND_EQUATION = 'blend.equation';
var S_BLEND_FUNC = 'blend.func';
var S_DEPTH_ENABLE = 'depth.enable';
var S_DEPTH_FUNC = 'depth.func';
var S_DEPTH_RANGE = 'depth.range';
var S_DEPTH_MASK = 'depth.mask';
var S_COLOR_MASK = 'colorMask';
var S_CULL_ENABLE = 'cull.enable';
var S_CULL_FACE = 'cull.face';
var S_FRONT_FACE = 'frontFace';
var S_LINE_WIDTH = 'lineWidth';
var S_POLYGON_OFFSET_ENABLE = 'polygonOffset.enable';
var S_POLYGON_OFFSET_OFFSET = 'polygonOffset.offset';
var S_SAMPLE_ALPHA = 'sample.alpha';
var S_SAMPLE_ENABLE = 'sample.enable';
var S_SAMPLE_COVERAGE = 'sample.coverage';
var S_STENCIL_ENABLE = 'stencil.enable';
var S_STENCIL_MASK = 'stencil.mask';
var S_STENCIL_FUNC = 'stencil.func';
var S_STENCIL_OPFRONT = 'stencil.opFront';
var S_STENCIL_OPBACK = 'stencil.opBack';
var S_SCISSOR_ENABLE = 'scissor.enable';
var S_SCISSOR_BOX = 'scissor.box';
var S_VIEWPORT = 'viewport';

var S_PROFILE = 'profile';

var S_FRAMEBUFFER = 'framebuffer';
var S_VERT = 'vert';
var S_FRAG = 'frag';
var S_ELEMENTS = 'elements';
var S_PRIMITIVE = 'primitive';
var S_COUNT = 'count';
var S_OFFSET = 'offset';
var S_INSTANCES = 'instances';

var SUFFIX_WIDTH = 'Width';
var SUFFIX_HEIGHT = 'Height';

var S_FRAMEBUFFER_WIDTH = S_FRAMEBUFFER + SUFFIX_WIDTH;
var S_FRAMEBUFFER_HEIGHT = S_FRAMEBUFFER + SUFFIX_HEIGHT;
var S_VIEWPORT_WIDTH = S_VIEWPORT + SUFFIX_WIDTH;
var S_VIEWPORT_HEIGHT = S_VIEWPORT + SUFFIX_HEIGHT;
var S_DRAWINGBUFFER = 'drawingBuffer';
var S_DRAWINGBUFFER_WIDTH = S_DRAWINGBUFFER + SUFFIX_WIDTH;
var S_DRAWINGBUFFER_HEIGHT = S_DRAWINGBUFFER + SUFFIX_HEIGHT;

var NESTED_OPTIONS = [
  S_BLEND_FUNC,
  S_BLEND_EQUATION,
  S_STENCIL_FUNC,
  S_STENCIL_OPFRONT,
  S_STENCIL_OPBACK,
  S_SAMPLE_COVERAGE,
  S_VIEWPORT,
  S_SCISSOR_BOX,
  S_POLYGON_OFFSET_OFFSET
];

var GL_ARRAY_BUFFER$1 = 34962;
var GL_ELEMENT_ARRAY_BUFFER$1 = 34963;

var GL_FRAGMENT_SHADER$1 = 35632;
var GL_VERTEX_SHADER$1 = 35633;

var GL_TEXTURE_2D$3 = 0x0DE1;
var GL_TEXTURE_CUBE_MAP$2 = 0x8513;

var GL_CULL_FACE = 0x0B44;
var GL_BLEND = 0x0BE2;
var GL_DITHER = 0x0BD0;
var GL_STENCIL_TEST = 0x0B90;
var GL_DEPTH_TEST = 0x0B71;
var GL_SCISSOR_TEST = 0x0C11;
var GL_POLYGON_OFFSET_FILL = 0x8037;
var GL_SAMPLE_ALPHA_TO_COVERAGE = 0x809E;
var GL_SAMPLE_COVERAGE = 0x80A0;

var GL_FLOAT$8 = 5126;
var GL_FLOAT_VEC2 = 35664;
var GL_FLOAT_VEC3 = 35665;
var GL_FLOAT_VEC4 = 35666;
var GL_INT$3 = 5124;
var GL_INT_VEC2 = 35667;
var GL_INT_VEC3 = 35668;
var GL_INT_VEC4 = 35669;
var GL_BOOL = 35670;
var GL_BOOL_VEC2 = 35671;
var GL_BOOL_VEC3 = 35672;
var GL_BOOL_VEC4 = 35673;
var GL_FLOAT_MAT2 = 35674;
var GL_FLOAT_MAT3 = 35675;
var GL_FLOAT_MAT4 = 35676;
var GL_SAMPLER_2D = 35678;
var GL_SAMPLER_CUBE = 35680;

var GL_TRIANGLES$1 = 4;

var GL_FRONT = 1028;
var GL_BACK = 1029;
var GL_CW = 0x0900;
var GL_CCW = 0x0901;
var GL_MIN_EXT = 0x8007;
var GL_MAX_EXT = 0x8008;
var GL_ALWAYS = 519;
var GL_KEEP = 7680;
var GL_ZERO = 0;
var GL_ONE = 1;
var GL_FUNC_ADD = 0x8006;
var GL_LESS = 513;

var GL_FRAMEBUFFER$2 = 0x8D40;
var GL_COLOR_ATTACHMENT0$2 = 0x8CE0;

var blendFuncs = {
  '0': 0,
  '1': 1,
  'zero': 0,
  'one': 1,
  'src color': 768,
  'one minus src color': 769,
  'src alpha': 770,
  'one minus src alpha': 771,
  'dst color': 774,
  'one minus dst color': 775,
  'dst alpha': 772,
  'one minus dst alpha': 773,
  'constant color': 32769,
  'one minus constant color': 32770,
  'constant alpha': 32771,
  'one minus constant alpha': 32772,
  'src alpha saturate': 776
};

// There are invalid values for srcRGB and dstRGB. See:
// https://www.khronos.org/registry/webgl/specs/1.0/#6.13
// https://github.com/KhronosGroup/WebGL/blob/0d3201f5f7ec3c0060bc1f04077461541f1987b9/conformance-suites/1.0.3/conformance/misc/webgl-specific.html#L56
var invalidBlendCombinations = [
  'constant color, constant alpha',
  'one minus constant color, constant alpha',
  'constant color, one minus constant alpha',
  'one minus constant color, one minus constant alpha',
  'constant alpha, constant color',
  'constant alpha, one minus constant color',
  'one minus constant alpha, constant color',
  'one minus constant alpha, one minus constant color'
];

var compareFuncs = {
  'never': 512,
  'less': 513,
  '<': 513,
  'equal': 514,
  '=': 514,
  '==': 514,
  '===': 514,
  'lequal': 515,
  '<=': 515,
  'greater': 516,
  '>': 516,
  'notequal': 517,
  '!=': 517,
  '!==': 517,
  'gequal': 518,
  '>=': 518,
  'always': 519
};

var stencilOps = {
  '0': 0,
  'zero': 0,
  'keep': 7680,
  'replace': 7681,
  'increment': 7682,
  'decrement': 7683,
  'increment wrap': 34055,
  'decrement wrap': 34056,
  'invert': 5386
};

var shaderType = {
  'frag': GL_FRAGMENT_SHADER$1,
  'vert': GL_VERTEX_SHADER$1
};

var orientationType = {
  'cw': GL_CW,
  'ccw': GL_CCW
};

function isBufferArgs (x) {
  return Array.isArray(x) ||
    isTypedArray(x) ||
    isNDArrayLike(x)
}

// Make sure viewport is processed first
function sortState (state) {
  return state.sort(function (a, b) {
    if (a === S_VIEWPORT) {
      return -1
    } else if (b === S_VIEWPORT) {
      return 1
    }
    return (a < b) ? -1 : 1
  })
}

function Declaration (thisDep, contextDep, propDep, append) {
  this.thisDep = thisDep;
  this.contextDep = contextDep;
  this.propDep = propDep;
  this.append = append;
}

function isStatic (decl) {
  return decl && !(decl.thisDep || decl.contextDep || decl.propDep)
}

function createStaticDecl (append) {
  return new Declaration(false, false, false, append)
}

function createDynamicDecl (dyn, append) {
  var type = dyn.type;
  if (type === DYN_FUNC$1) {
    var numArgs = dyn.data.length;
    return new Declaration(
      true,
      numArgs >= 1,
      numArgs >= 2,
      append)
  } else if (type === DYN_THUNK) {
    var data = dyn.data;
    return new Declaration(
      data.thisDep,
      data.contextDep,
      data.propDep,
      append)
  } else {
    return new Declaration(
      type === DYN_STATE$1,
      type === DYN_CONTEXT$1,
      type === DYN_PROP$1,
      append)
  }
}

var SCOPE_DECL = new Declaration(false, false, false, function () {});

function reglCore (
  gl,
  stringStore,
  extensions,
  limits,
  bufferState,
  elementState,
  textureState,
  framebufferState,
  uniformState,
  attributeState,
  shaderState,
  drawState,
  contextState,
  timer,
  config) {
  var AttributeRecord = attributeState.Record;

  var blendEquations = {
    'add': 32774,
    'subtract': 32778,
    'reverse subtract': 32779
  };
  if (extensions.ext_blend_minmax) {
    blendEquations.min = GL_MIN_EXT;
    blendEquations.max = GL_MAX_EXT;
  }

  var extInstancing = extensions.angle_instanced_arrays;
  var extDrawBuffers = extensions.webgl_draw_buffers;

  // ===================================================
  // ===================================================
  // WEBGL STATE
  // ===================================================
  // ===================================================
  var currentState = {
    dirty: true,
    profile: config.profile
  };
  var nextState = {};
  var GL_STATE_NAMES = [];
  var GL_FLAGS = {};
  var GL_VARIABLES = {};

  function propName (name) {
    return name.replace('.', '_')
  }

  function stateFlag (sname, cap, init) {
    var name = propName(sname);
    GL_STATE_NAMES.push(sname);
    nextState[name] = currentState[name] = !!init;
    GL_FLAGS[name] = cap;
  }

  function stateVariable (sname, func, init) {
    var name = propName(sname);
    GL_STATE_NAMES.push(sname);
    if (Array.isArray(init)) {
      currentState[name] = init.slice();
      nextState[name] = init.slice();
    } else {
      currentState[name] = nextState[name] = init;
    }
    GL_VARIABLES[name] = func;
  }

  // Dithering
  stateFlag(S_DITHER, GL_DITHER);

  // Blending
  stateFlag(S_BLEND_ENABLE, GL_BLEND);
  stateVariable(S_BLEND_COLOR, 'blendColor', [0, 0, 0, 0]);
  stateVariable(S_BLEND_EQUATION, 'blendEquationSeparate',
    [GL_FUNC_ADD, GL_FUNC_ADD]);
  stateVariable(S_BLEND_FUNC, 'blendFuncSeparate',
    [GL_ONE, GL_ZERO, GL_ONE, GL_ZERO]);

  // Depth
  stateFlag(S_DEPTH_ENABLE, GL_DEPTH_TEST, true);
  stateVariable(S_DEPTH_FUNC, 'depthFunc', GL_LESS);
  stateVariable(S_DEPTH_RANGE, 'depthRange', [0, 1]);
  stateVariable(S_DEPTH_MASK, 'depthMask', true);

  // Color mask
  stateVariable(S_COLOR_MASK, S_COLOR_MASK, [true, true, true, true]);

  // Face culling
  stateFlag(S_CULL_ENABLE, GL_CULL_FACE);
  stateVariable(S_CULL_FACE, 'cullFace', GL_BACK);

  // Front face orientation
  stateVariable(S_FRONT_FACE, S_FRONT_FACE, GL_CCW);

  // Line width
  stateVariable(S_LINE_WIDTH, S_LINE_WIDTH, 1);

  // Polygon offset
  stateFlag(S_POLYGON_OFFSET_ENABLE, GL_POLYGON_OFFSET_FILL);
  stateVariable(S_POLYGON_OFFSET_OFFSET, 'polygonOffset', [0, 0]);

  // Sample coverage
  stateFlag(S_SAMPLE_ALPHA, GL_SAMPLE_ALPHA_TO_COVERAGE);
  stateFlag(S_SAMPLE_ENABLE, GL_SAMPLE_COVERAGE);
  stateVariable(S_SAMPLE_COVERAGE, 'sampleCoverage', [1, false]);

  // Stencil
  stateFlag(S_STENCIL_ENABLE, GL_STENCIL_TEST);
  stateVariable(S_STENCIL_MASK, 'stencilMask', -1);
  stateVariable(S_STENCIL_FUNC, 'stencilFunc', [GL_ALWAYS, 0, -1]);
  stateVariable(S_STENCIL_OPFRONT, 'stencilOpSeparate',
    [GL_FRONT, GL_KEEP, GL_KEEP, GL_KEEP]);
  stateVariable(S_STENCIL_OPBACK, 'stencilOpSeparate',
    [GL_BACK, GL_KEEP, GL_KEEP, GL_KEEP]);

  // Scissor
  stateFlag(S_SCISSOR_ENABLE, GL_SCISSOR_TEST);
  stateVariable(S_SCISSOR_BOX, 'scissor',
    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

  // Viewport
  stateVariable(S_VIEWPORT, S_VIEWPORT,
    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

  // ===================================================
  // ===================================================
  // ENVIRONMENT
  // ===================================================
  // ===================================================
  var sharedState = {
    gl: gl,
    context: contextState,
    strings: stringStore,
    next: nextState,
    current: currentState,
    draw: drawState,
    elements: elementState,
    buffer: bufferState,
    shader: shaderState,
    attributes: attributeState.state,
    uniforms: uniformState,
    framebuffer: framebufferState,
    extensions: extensions,

    timer: timer,
    isBufferArgs: isBufferArgs
  };

  var sharedConstants = {
    primTypes: primTypes,
    compareFuncs: compareFuncs,
    blendFuncs: blendFuncs,
    blendEquations: blendEquations,
    stencilOps: stencilOps,
    glTypes: glTypes,
    orientationType: orientationType
  };

  check$1.optional(function () {
    sharedState.isArrayLike = isArrayLike;
  });

  if (extDrawBuffers) {
    sharedConstants.backBuffer = [GL_BACK];
    sharedConstants.drawBuffer = loop(limits.maxDrawbuffers, function (i) {
      if (i === 0) {
        return [0]
      }
      return loop(i, function (j) {
        return GL_COLOR_ATTACHMENT0$2 + j
      })
    });
  }

  var drawCallCounter = 0;
  function createREGLEnvironment () {
    var env = createEnvironment();
    var link = env.link;
    var global = env.global;
    env.id = drawCallCounter++;

    env.batchId = '0';

    // link shared state
    var SHARED = link(sharedState);
    var shared = env.shared = {
      props: 'a0'
    };
    Object.keys(sharedState).forEach(function (prop) {
      shared[prop] = global.def(SHARED, '.', prop);
    });

    // Inject runtime assertion stuff for debug builds
    check$1.optional(function () {
      env.CHECK = link(check$1);
      env.commandStr = check$1.guessCommand();
      env.command = link(env.commandStr);
      env.assert = function (block, pred, message) {
        block(
          'if(!(', pred, '))',
          this.CHECK, '.commandRaise(', link(message), ',', this.command, ');');
      };

      sharedConstants.invalidBlendCombinations = invalidBlendCombinations;
    });

    // Copy GL state variables over
    var nextVars = env.next = {};
    var currentVars = env.current = {};
    Object.keys(GL_VARIABLES).forEach(function (variable) {
      if (Array.isArray(currentState[variable])) {
        nextVars[variable] = global.def(shared.next, '.', variable);
        currentVars[variable] = global.def(shared.current, '.', variable);
      }
    });

    // Initialize shared constants
    var constants = env.constants = {};
    Object.keys(sharedConstants).forEach(function (name) {
      constants[name] = global.def(JSON.stringify(sharedConstants[name]));
    });

    // Helper function for calling a block
    env.invoke = function (block, x) {
      switch (x.type) {
        case DYN_FUNC$1:
          var argList = [
            'this',
            shared.context,
            shared.props,
            env.batchId
          ];
          return block.def(
            link(x.data), '.call(',
              argList.slice(0, Math.max(x.data.length + 1, 4)),
             ')')
        case DYN_PROP$1:
          return block.def(shared.props, x.data)
        case DYN_CONTEXT$1:
          return block.def(shared.context, x.data)
        case DYN_STATE$1:
          return block.def('this', x.data)
        case DYN_THUNK:
          x.data.append(env, block);
          return x.data.ref
      }
    };

    env.attribCache = {};

    var scopeAttribs = {};
    env.scopeAttrib = function (name) {
      var id = stringStore.id(name);
      if (id in scopeAttribs) {
        return scopeAttribs[id]
      }
      var binding = attributeState.scope[id];
      if (!binding) {
        binding = attributeState.scope[id] = new AttributeRecord();
      }
      var result = scopeAttribs[id] = link(binding);
      return result
    };

    return env
  }

  // ===================================================
  // ===================================================
  // PARSING
  // ===================================================
  // ===================================================
  function parseProfile (options) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    var profileEnable;
    if (S_PROFILE in staticOptions) {
      var value = !!staticOptions[S_PROFILE];
      profileEnable = createStaticDecl(function (env, scope) {
        return value
      });
      profileEnable.enable = value;
    } else if (S_PROFILE in dynamicOptions) {
      var dyn = dynamicOptions[S_PROFILE];
      profileEnable = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    }

    return profileEnable
  }

  function parseFramebuffer (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    if (S_FRAMEBUFFER in staticOptions) {
      var framebuffer = staticOptions[S_FRAMEBUFFER];
      if (framebuffer) {
        framebuffer = framebufferState.getFramebuffer(framebuffer);
        check$1.command(framebuffer, 'invalid framebuffer object');
        return createStaticDecl(function (env, block) {
          var FRAMEBUFFER = env.link(framebuffer);
          var shared = env.shared;
          block.set(
            shared.framebuffer,
            '.next',
            FRAMEBUFFER);
          var CONTEXT = shared.context;
          block.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_WIDTH,
            FRAMEBUFFER + '.width');
          block.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_HEIGHT,
            FRAMEBUFFER + '.height');
          return FRAMEBUFFER
        })
      } else {
        return createStaticDecl(function (env, scope) {
          var shared = env.shared;
          scope.set(
            shared.framebuffer,
            '.next',
            'null');
          var CONTEXT = shared.context;
          scope.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_WIDTH,
            CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
          scope.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_HEIGHT,
            CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
          return 'null'
        })
      }
    } else if (S_FRAMEBUFFER in dynamicOptions) {
      var dyn = dynamicOptions[S_FRAMEBUFFER];
      return createDynamicDecl(dyn, function (env, scope) {
        var FRAMEBUFFER_FUNC = env.invoke(scope, dyn);
        var shared = env.shared;
        var FRAMEBUFFER_STATE = shared.framebuffer;
        var FRAMEBUFFER = scope.def(
          FRAMEBUFFER_STATE, '.getFramebuffer(', FRAMEBUFFER_FUNC, ')');

        check$1.optional(function () {
          env.assert(scope,
            '!' + FRAMEBUFFER_FUNC + '||' + FRAMEBUFFER,
            'invalid framebuffer object');
        });

        scope.set(
          FRAMEBUFFER_STATE,
          '.next',
          FRAMEBUFFER);
        var CONTEXT = shared.context;
        scope.set(
          CONTEXT,
          '.' + S_FRAMEBUFFER_WIDTH,
          FRAMEBUFFER + '?' + FRAMEBUFFER + '.width:' +
          CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
        scope.set(
          CONTEXT,
          '.' + S_FRAMEBUFFER_HEIGHT,
          FRAMEBUFFER +
          '?' + FRAMEBUFFER + '.height:' +
          CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
        return FRAMEBUFFER
      })
    } else {
      return null
    }
  }

  function parseViewportScissor (options, framebuffer, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseBox (param) {
      if (param in staticOptions) {
        var box = staticOptions[param];
        check$1.commandType(box, 'object', 'invalid ' + param, env.commandStr);

        var isStatic = true;
        var x = box.x | 0;
        var y = box.y | 0;
        var w, h;
        if ('width' in box) {
          w = box.width | 0;
          check$1.command(w >= 0, 'invalid ' + param, env.commandStr);
        } else {
          isStatic = false;
        }
        if ('height' in box) {
          h = box.height | 0;
          check$1.command(h >= 0, 'invalid ' + param, env.commandStr);
        } else {
          isStatic = false;
        }

        return new Declaration(
          !isStatic && framebuffer && framebuffer.thisDep,
          !isStatic && framebuffer && framebuffer.contextDep,
          !isStatic && framebuffer && framebuffer.propDep,
          function (env, scope) {
            var CONTEXT = env.shared.context;
            var BOX_W = w;
            if (!('width' in box)) {
              BOX_W = scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', x);
            }
            var BOX_H = h;
            if (!('height' in box)) {
              BOX_H = scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', y);
            }
            return [x, y, BOX_W, BOX_H]
          })
      } else if (param in dynamicOptions) {
        var dynBox = dynamicOptions[param];
        var result = createDynamicDecl(dynBox, function (env, scope) {
          var BOX = env.invoke(scope, dynBox);

          check$1.optional(function () {
            env.assert(scope,
              BOX + '&&typeof ' + BOX + '==="object"',
              'invalid ' + param);
          });

          var CONTEXT = env.shared.context;
          var BOX_X = scope.def(BOX, '.x|0');
          var BOX_Y = scope.def(BOX, '.y|0');
          var BOX_W = scope.def(
            '"width" in ', BOX, '?', BOX, '.width|0:',
            '(', CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', BOX_X, ')');
          var BOX_H = scope.def(
            '"height" in ', BOX, '?', BOX, '.height|0:',
            '(', CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', BOX_Y, ')');

          check$1.optional(function () {
            env.assert(scope,
              BOX_W + '>=0&&' +
              BOX_H + '>=0',
              'invalid ' + param);
          });

          return [BOX_X, BOX_Y, BOX_W, BOX_H]
        });
        if (framebuffer) {
          result.thisDep = result.thisDep || framebuffer.thisDep;
          result.contextDep = result.contextDep || framebuffer.contextDep;
          result.propDep = result.propDep || framebuffer.propDep;
        }
        return result
      } else if (framebuffer) {
        return new Declaration(
          framebuffer.thisDep,
          framebuffer.contextDep,
          framebuffer.propDep,
          function (env, scope) {
            var CONTEXT = env.shared.context;
            return [
              0, 0,
              scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH),
              scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT)]
          })
      } else {
        return null
      }
    }

    var viewport = parseBox(S_VIEWPORT);

    if (viewport) {
      var prevViewport = viewport;
      viewport = new Declaration(
        viewport.thisDep,
        viewport.contextDep,
        viewport.propDep,
        function (env, scope) {
          var VIEWPORT = prevViewport.append(env, scope);
          var CONTEXT = env.shared.context;
          scope.set(
            CONTEXT,
            '.' + S_VIEWPORT_WIDTH,
            VIEWPORT[2]);
          scope.set(
            CONTEXT,
            '.' + S_VIEWPORT_HEIGHT,
            VIEWPORT[3]);
          return VIEWPORT
        });
    }

    return {
      viewport: viewport,
      scissor_box: parseBox(S_SCISSOR_BOX)
    }
  }

  function parseProgram (options) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseShader (name) {
      if (name in staticOptions) {
        var id = stringStore.id(staticOptions[name]);
        check$1.optional(function () {
          shaderState.shader(shaderType[name], id, check$1.guessCommand());
        });
        var result = createStaticDecl(function () {
          return id
        });
        result.id = id;
        return result
      } else if (name in dynamicOptions) {
        var dyn = dynamicOptions[name];
        return createDynamicDecl(dyn, function (env, scope) {
          var str = env.invoke(scope, dyn);
          var id = scope.def(env.shared.strings, '.id(', str, ')');
          check$1.optional(function () {
            scope(
              env.shared.shader, '.shader(',
              shaderType[name], ',',
              id, ',',
              env.command, ');');
          });
          return id
        })
      }
      return null
    }

    var frag = parseShader(S_FRAG);
    var vert = parseShader(S_VERT);

    var program = null;
    var progVar;
    if (isStatic(frag) && isStatic(vert)) {
      program = shaderState.program(vert.id, frag.id);
      progVar = createStaticDecl(function (env, scope) {
        return env.link(program)
      });
    } else {
      progVar = new Declaration(
        (frag && frag.thisDep) || (vert && vert.thisDep),
        (frag && frag.contextDep) || (vert && vert.contextDep),
        (frag && frag.propDep) || (vert && vert.propDep),
        function (env, scope) {
          var SHADER_STATE = env.shared.shader;
          var fragId;
          if (frag) {
            fragId = frag.append(env, scope);
          } else {
            fragId = scope.def(SHADER_STATE, '.', S_FRAG);
          }
          var vertId;
          if (vert) {
            vertId = vert.append(env, scope);
          } else {
            vertId = scope.def(SHADER_STATE, '.', S_VERT);
          }
          var progDef = SHADER_STATE + '.program(' + vertId + ',' + fragId;
          check$1.optional(function () {
            progDef += ',' + env.command;
          });
          return scope.def(progDef + ')')
        });
    }

    return {
      frag: frag,
      vert: vert,
      progVar: progVar,
      program: program
    }
  }

  function parseDraw (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseElements () {
      if (S_ELEMENTS in staticOptions) {
        var elements = staticOptions[S_ELEMENTS];
        if (isBufferArgs(elements)) {
          elements = elementState.getElements(elementState.create(elements, true));
        } else if (elements) {
          elements = elementState.getElements(elements);
          check$1.command(elements, 'invalid elements', env.commandStr);
        }
        var result = createStaticDecl(function (env, scope) {
          if (elements) {
            var result = env.link(elements);
            env.ELEMENTS = result;
            return result
          }
          env.ELEMENTS = null;
          return null
        });
        result.value = elements;
        return result
      } else if (S_ELEMENTS in dynamicOptions) {
        var dyn = dynamicOptions[S_ELEMENTS];
        return createDynamicDecl(dyn, function (env, scope) {
          var shared = env.shared;

          var IS_BUFFER_ARGS = shared.isBufferArgs;
          var ELEMENT_STATE = shared.elements;

          var elementDefn = env.invoke(scope, dyn);
          var elements = scope.def('null');
          var elementStream = scope.def(IS_BUFFER_ARGS, '(', elementDefn, ')');

          var ifte = env.cond(elementStream)
            .then(elements, '=', ELEMENT_STATE, '.createStream(', elementDefn, ');')
            .else(elements, '=', ELEMENT_STATE, '.getElements(', elementDefn, ');');

          check$1.optional(function () {
            env.assert(ifte.else,
              '!' + elementDefn + '||' + elements,
              'invalid elements');
          });

          scope.entry(ifte);
          scope.exit(
            env.cond(elementStream)
              .then(ELEMENT_STATE, '.destroyStream(', elements, ');'));

          env.ELEMENTS = elements;

          return elements
        })
      }

      return null
    }

    var elements = parseElements();

    function parsePrimitive () {
      if (S_PRIMITIVE in staticOptions) {
        var primitive = staticOptions[S_PRIMITIVE];
        check$1.commandParameter(primitive, primTypes, 'invalid primitve', env.commandStr);
        return createStaticDecl(function (env, scope) {
          return primTypes[primitive]
        })
      } else if (S_PRIMITIVE in dynamicOptions) {
        var dynPrimitive = dynamicOptions[S_PRIMITIVE];
        return createDynamicDecl(dynPrimitive, function (env, scope) {
          var PRIM_TYPES = env.constants.primTypes;
          var prim = env.invoke(scope, dynPrimitive);
          check$1.optional(function () {
            env.assert(scope,
              prim + ' in ' + PRIM_TYPES,
              'invalid primitive, must be one of ' + Object.keys(primTypes));
          });
          return scope.def(PRIM_TYPES, '[', prim, ']')
        })
      } else if (elements) {
        if (isStatic(elements)) {
          if (elements.value) {
            return createStaticDecl(function (env, scope) {
              return scope.def(env.ELEMENTS, '.primType')
            })
          } else {
            return createStaticDecl(function () {
              return GL_TRIANGLES$1
            })
          }
        } else {
          return new Declaration(
            elements.thisDep,
            elements.contextDep,
            elements.propDep,
            function (env, scope) {
              var elements = env.ELEMENTS;
              return scope.def(elements, '?', elements, '.primType:', GL_TRIANGLES$1)
            })
        }
      }
      return null
    }

    function parseParam (param, isOffset) {
      if (param in staticOptions) {
        var value = staticOptions[param] | 0;
        check$1.command(!isOffset || value >= 0, 'invalid ' + param, env.commandStr);
        return createStaticDecl(function (env, scope) {
          if (isOffset) {
            env.OFFSET = value;
          }
          return value
        })
      } else if (param in dynamicOptions) {
        var dynValue = dynamicOptions[param];
        return createDynamicDecl(dynValue, function (env, scope) {
          var result = env.invoke(scope, dynValue);
          if (isOffset) {
            env.OFFSET = result;
            check$1.optional(function () {
              env.assert(scope,
                result + '>=0',
                'invalid ' + param);
            });
          }
          return result
        })
      } else if (isOffset && elements) {
        return createStaticDecl(function (env, scope) {
          env.OFFSET = '0';
          return 0
        })
      }
      return null
    }

    var OFFSET = parseParam(S_OFFSET, true);

    function parseVertCount () {
      if (S_COUNT in staticOptions) {
        var count = staticOptions[S_COUNT] | 0;
        check$1.command(
          typeof count === 'number' && count >= 0, 'invalid vertex count', env.commandStr);
        return createStaticDecl(function () {
          return count
        })
      } else if (S_COUNT in dynamicOptions) {
        var dynCount = dynamicOptions[S_COUNT];
        return createDynamicDecl(dynCount, function (env, scope) {
          var result = env.invoke(scope, dynCount);
          check$1.optional(function () {
            env.assert(scope,
              'typeof ' + result + '==="number"&&' +
              result + '>=0&&' +
              result + '===(' + result + '|0)',
              'invalid vertex count');
          });
          return result
        })
      } else if (elements) {
        if (isStatic(elements)) {
          if (elements) {
            if (OFFSET) {
              return new Declaration(
                OFFSET.thisDep,
                OFFSET.contextDep,
                OFFSET.propDep,
                function (env, scope) {
                  var result = scope.def(
                    env.ELEMENTS, '.vertCount-', env.OFFSET);

                  check$1.optional(function () {
                    env.assert(scope,
                      result + '>=0',
                      'invalid vertex offset/element buffer too small');
                  });

                  return result
                })
            } else {
              return createStaticDecl(function (env, scope) {
                return scope.def(env.ELEMENTS, '.vertCount')
              })
            }
          } else {
            var result = createStaticDecl(function () {
              return -1
            });
            check$1.optional(function () {
              result.MISSING = true;
            });
            return result
          }
        } else {
          var variable = new Declaration(
            elements.thisDep || OFFSET.thisDep,
            elements.contextDep || OFFSET.contextDep,
            elements.propDep || OFFSET.propDep,
            function (env, scope) {
              var elements = env.ELEMENTS;
              if (env.OFFSET) {
                return scope.def(elements, '?', elements, '.vertCount-',
                  env.OFFSET, ':-1')
              }
              return scope.def(elements, '?', elements, '.vertCount:-1')
            });
          check$1.optional(function () {
            variable.DYNAMIC = true;
          });
          return variable
        }
      }
      return null
    }

    return {
      elements: elements,
      primitive: parsePrimitive(),
      count: parseVertCount(),
      instances: parseParam(S_INSTANCES, false),
      offset: OFFSET
    }
  }

  function parseGLState (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    var STATE = {};

    GL_STATE_NAMES.forEach(function (prop) {
      var param = propName(prop);

      function parseParam (parseStatic, parseDynamic) {
        if (prop in staticOptions) {
          var value = parseStatic(staticOptions[prop]);
          STATE[param] = createStaticDecl(function () {
            return value
          });
        } else if (prop in dynamicOptions) {
          var dyn = dynamicOptions[prop];
          STATE[param] = createDynamicDecl(dyn, function (env, scope) {
            return parseDynamic(env, scope, env.invoke(scope, dyn))
          });
        }
      }

      switch (prop) {
        case S_CULL_ENABLE:
        case S_BLEND_ENABLE:
        case S_DITHER:
        case S_STENCIL_ENABLE:
        case S_DEPTH_ENABLE:
        case S_SCISSOR_ENABLE:
        case S_POLYGON_OFFSET_ENABLE:
        case S_SAMPLE_ALPHA:
        case S_SAMPLE_ENABLE:
        case S_DEPTH_MASK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'boolean', prop, env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="boolean"',
                  'invalid flag ' + prop, env.commandStr);
              });
              return value
            })

        case S_DEPTH_FUNC:
          return parseParam(
            function (value) {
              check$1.commandParameter(value, compareFuncs, 'invalid ' + prop, env.commandStr);
              return compareFuncs[value]
            },
            function (env, scope, value) {
              var COMPARE_FUNCS = env.constants.compareFuncs;
              check$1.optional(function () {
                env.assert(scope,
                  value + ' in ' + COMPARE_FUNCS,
                  'invalid ' + prop + ', must be one of ' + Object.keys(compareFuncs));
              });
              return scope.def(COMPARE_FUNCS, '[', value, ']')
            })

        case S_DEPTH_RANGE:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) &&
                value.length === 2 &&
                typeof value[0] === 'number' &&
                typeof value[1] === 'number' &&
                value[0] <= value[1],
                'depth range is 2d array',
                env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===2&&' +
                  'typeof ' + value + '[0]==="number"&&' +
                  'typeof ' + value + '[1]==="number"&&' +
                  value + '[0]<=' + value + '[1]',
                  'depth range must be a 2d array');
              });

              var Z_NEAR = scope.def('+', value, '[0]');
              var Z_FAR = scope.def('+', value, '[1]');
              return [Z_NEAR, Z_FAR]
            })

        case S_BLEND_FUNC:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', 'blend.func', env.commandStr);
              var srcRGB = ('srcRGB' in value ? value.srcRGB : value.src);
              var srcAlpha = ('srcAlpha' in value ? value.srcAlpha : value.src);
              var dstRGB = ('dstRGB' in value ? value.dstRGB : value.dst);
              var dstAlpha = ('dstAlpha' in value ? value.dstAlpha : value.dst);
              check$1.commandParameter(srcRGB, blendFuncs, param + '.srcRGB', env.commandStr);
              check$1.commandParameter(srcAlpha, blendFuncs, param + '.srcAlpha', env.commandStr);
              check$1.commandParameter(dstRGB, blendFuncs, param + '.dstRGB', env.commandStr);
              check$1.commandParameter(dstAlpha, blendFuncs, param + '.dstAlpha', env.commandStr);

              check$1.command(
                (invalidBlendCombinations.indexOf(srcRGB + ', ' + dstRGB) === -1),
                'unallowed blending combination (srcRGB, dstRGB) = (' + srcRGB + ', ' + dstRGB + ')', env.commandStr);

              return [
                blendFuncs[srcRGB],
                blendFuncs[dstRGB],
                blendFuncs[srcAlpha],
                blendFuncs[dstAlpha]
              ]
            },
            function (env, scope, value) {
              var BLEND_FUNCS = env.constants.blendFuncs;

              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid blend func, must be an object');
              });

              function read (prefix, suffix) {
                var func = scope.def(
                  '"', prefix, suffix, '" in ', value,
                  '?', value, '.', prefix, suffix,
                  ':', value, '.', prefix);

                check$1.optional(function () {
                  env.assert(scope,
                    func + ' in ' + BLEND_FUNCS,
                    'invalid ' + prop + '.' + prefix + suffix + ', must be one of ' + Object.keys(blendFuncs));
                });

                return func
              }

              var srcRGB = read('src', 'RGB');
              var dstRGB = read('dst', 'RGB');

              check$1.optional(function () {
                var INVALID_BLEND_COMBINATIONS = env.constants.invalidBlendCombinations;

                env.assert(scope,
                           INVALID_BLEND_COMBINATIONS +
                           '.indexOf(' + srcRGB + '+", "+' + dstRGB + ') === -1 ',
                           'unallowed blending combination for (srcRGB, dstRGB)'
                          );
              });

              var SRC_RGB = scope.def(BLEND_FUNCS, '[', srcRGB, ']');
              var SRC_ALPHA = scope.def(BLEND_FUNCS, '[', read('src', 'Alpha'), ']');
              var DST_RGB = scope.def(BLEND_FUNCS, '[', dstRGB, ']');
              var DST_ALPHA = scope.def(BLEND_FUNCS, '[', read('dst', 'Alpha'), ']');

              return [SRC_RGB, DST_RGB, SRC_ALPHA, DST_ALPHA]
            })

        case S_BLEND_EQUATION:
          return parseParam(
            function (value) {
              if (typeof value === 'string') {
                check$1.commandParameter(value, blendEquations, 'invalid ' + prop, env.commandStr);
                return [
                  blendEquations[value],
                  blendEquations[value]
                ]
              } else if (typeof value === 'object') {
                check$1.commandParameter(
                  value.rgb, blendEquations, prop + '.rgb', env.commandStr);
                check$1.commandParameter(
                  value.alpha, blendEquations, prop + '.alpha', env.commandStr);
                return [
                  blendEquations[value.rgb],
                  blendEquations[value.alpha]
                ]
              } else {
                check$1.commandRaise('invalid blend.equation', env.commandStr);
              }
            },
            function (env, scope, value) {
              var BLEND_EQUATIONS = env.constants.blendEquations;

              var RGB = scope.def();
              var ALPHA = scope.def();

              var ifte = env.cond('typeof ', value, '==="string"');

              check$1.optional(function () {
                function checkProp (block, name, value) {
                  env.assert(block,
                    value + ' in ' + BLEND_EQUATIONS,
                    'invalid ' + name + ', must be one of ' + Object.keys(blendEquations));
                }
                checkProp(ifte.then, prop, value);

                env.assert(ifte.else,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
                checkProp(ifte.else, prop + '.rgb', value + '.rgb');
                checkProp(ifte.else, prop + '.alpha', value + '.alpha');
              });

              ifte.then(
                RGB, '=', ALPHA, '=', BLEND_EQUATIONS, '[', value, '];');
              ifte.else(
                RGB, '=', BLEND_EQUATIONS, '[', value, '.rgb];',
                ALPHA, '=', BLEND_EQUATIONS, '[', value, '.alpha];');

              scope(ifte);

              return [RGB, ALPHA]
            })

        case S_BLEND_COLOR:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) &&
                value.length === 4,
                'blend.color must be a 4d array', env.commandStr);
              return loop(4, function (i) {
                return +value[i]
              })
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===4',
                  'blend.color must be a 4d array');
              });
              return loop(4, function (i) {
                return scope.def('+', value, '[', i, ']')
              })
            })

        case S_STENCIL_MASK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'number', param, env.commandStr);
              return value | 0
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="number"',
                  'invalid stencil.mask');
              });
              return scope.def(value, '|0')
            })

        case S_STENCIL_FUNC:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var cmp = value.cmp || 'keep';
              var ref = value.ref || 0;
              var mask = 'mask' in value ? value.mask : -1;
              check$1.commandParameter(cmp, compareFuncs, prop + '.cmp', env.commandStr);
              check$1.commandType(ref, 'number', prop + '.ref', env.commandStr);
              check$1.commandType(mask, 'number', prop + '.mask', env.commandStr);
              return [
                compareFuncs[cmp],
                ref,
                mask
              ]
            },
            function (env, scope, value) {
              var COMPARE_FUNCS = env.constants.compareFuncs;
              check$1.optional(function () {
                function assert () {
                  env.assert(scope,
                    Array.prototype.join.call(arguments, ''),
                    'invalid stencil.func');
                }
                assert(value + '&&typeof ', value, '==="object"');
                assert('!("cmp" in ', value, ')||(',
                  value, '.cmp in ', COMPARE_FUNCS, ')');
              });
              var cmp = scope.def(
                '"cmp" in ', value,
                '?', COMPARE_FUNCS, '[', value, '.cmp]',
                ':', GL_KEEP);
              var ref = scope.def(value, '.ref|0');
              var mask = scope.def(
                '"mask" in ', value,
                '?', value, '.mask|0:-1');
              return [cmp, ref, mask]
            })

        case S_STENCIL_OPFRONT:
        case S_STENCIL_OPBACK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var fail = value.fail || 'keep';
              var zfail = value.zfail || 'keep';
              var zpass = value.zpass || 'keep';
              check$1.commandParameter(fail, stencilOps, prop + '.fail', env.commandStr);
              check$1.commandParameter(zfail, stencilOps, prop + '.zfail', env.commandStr);
              check$1.commandParameter(zpass, stencilOps, prop + '.zpass', env.commandStr);
              return [
                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                stencilOps[fail],
                stencilOps[zfail],
                stencilOps[zpass]
              ]
            },
            function (env, scope, value) {
              var STENCIL_OPS = env.constants.stencilOps;

              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
              });

              function read (name) {
                check$1.optional(function () {
                  env.assert(scope,
                    '!("' + name + '" in ' + value + ')||' +
                    '(' + value + '.' + name + ' in ' + STENCIL_OPS + ')',
                    'invalid ' + prop + '.' + name + ', must be one of ' + Object.keys(stencilOps));
                });

                return scope.def(
                  '"', name, '" in ', value,
                  '?', STENCIL_OPS, '[', value, '.', name, ']:',
                  GL_KEEP)
              }

              return [
                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                read('fail'),
                read('zfail'),
                read('zpass')
              ]
            })

        case S_POLYGON_OFFSET_OFFSET:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var factor = value.factor | 0;
              var units = value.units | 0;
              check$1.commandType(factor, 'number', param + '.factor', env.commandStr);
              check$1.commandType(units, 'number', param + '.units', env.commandStr);
              return [factor, units]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
              });

              var FACTOR = scope.def(value, '.factor|0');
              var UNITS = scope.def(value, '.units|0');

              return [FACTOR, UNITS]
            })

        case S_CULL_FACE:
          return parseParam(
            function (value) {
              var face = 0;
              if (value === 'front') {
                face = GL_FRONT;
              } else if (value === 'back') {
                face = GL_BACK;
              }
              check$1.command(!!face, param, env.commandStr);
              return face
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '==="front"||' +
                  value + '==="back"',
                  'invalid cull.face');
              });
              return scope.def(value, '==="front"?', GL_FRONT, ':', GL_BACK)
            })

        case S_LINE_WIDTH:
          return parseParam(
            function (value) {
              check$1.command(
                typeof value === 'number' &&
                value >= limits.lineWidthDims[0] &&
                value <= limits.lineWidthDims[1],
                'invalid line width, must be a positive number between ' +
                limits.lineWidthDims[0] + ' and ' + limits.lineWidthDims[1], env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="number"&&' +
                  value + '>=' + limits.lineWidthDims[0] + '&&' +
                  value + '<=' + limits.lineWidthDims[1],
                  'invalid line width');
              });

              return value
            })

        case S_FRONT_FACE:
          return parseParam(
            function (value) {
              check$1.commandParameter(value, orientationType, param, env.commandStr);
              return orientationType[value]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '==="cw"||' +
                  value + '==="ccw"',
                  'invalid frontFace, must be one of cw,ccw');
              });
              return scope.def(value + '==="cw"?' + GL_CW + ':' + GL_CCW)
            })

        case S_COLOR_MASK:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) && value.length === 4,
                'color.mask must be length 4 array', env.commandStr);
              return value.map(function (v) { return !!v })
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===4',
                  'invalid color.mask');
              });
              return loop(4, function (i) {
                return '!!' + value + '[' + i + ']'
              })
            })

        case S_SAMPLE_COVERAGE:
          return parseParam(
            function (value) {
              check$1.command(typeof value === 'object' && value, param, env.commandStr);
              var sampleValue = 'value' in value ? value.value : 1;
              var sampleInvert = !!value.invert;
              check$1.command(
                typeof sampleValue === 'number' &&
                sampleValue >= 0 && sampleValue <= 1,
                'sample.coverage.value must be a number between 0 and 1', env.commandStr);
              return [sampleValue, sampleInvert]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid sample.coverage');
              });
              var VALUE = scope.def(
                '"value" in ', value, '?+', value, '.value:1');
              var INVERT = scope.def('!!', value, '.invert');
              return [VALUE, INVERT]
            })
      }
    });

    return STATE
  }

  function parseUniforms (uniforms, env) {
    var staticUniforms = uniforms.static;
    var dynamicUniforms = uniforms.dynamic;

    var UNIFORMS = {};

    Object.keys(staticUniforms).forEach(function (name) {
      var value = staticUniforms[name];
      var result;
      if (typeof value === 'number' ||
          typeof value === 'boolean') {
        result = createStaticDecl(function () {
          return value
        });
      } else if (typeof value === 'function') {
        var reglType = value._reglType;
        if (reglType === 'texture2d' ||
            reglType === 'textureCube') {
          result = createStaticDecl(function (env) {
            return env.link(value)
          });
        } else if (reglType === 'framebuffer' ||
                   reglType === 'framebufferCube') {
          check$1.command(value.color.length > 0,
            'missing color attachment for framebuffer sent to uniform "' + name + '"', env.commandStr);
          result = createStaticDecl(function (env) {
            return env.link(value.color[0])
          });
        } else {
          check$1.commandRaise('invalid data for uniform "' + name + '"', env.commandStr);
        }
      } else if (isArrayLike(value)) {
        result = createStaticDecl(function (env) {
          var ITEM = env.global.def('[',
            loop(value.length, function (i) {
              check$1.command(
                typeof value[i] === 'number' ||
                typeof value[i] === 'boolean',
                'invalid uniform ' + name, env.commandStr);
              return value[i]
            }), ']');
          return ITEM
        });
      } else {
        check$1.commandRaise('invalid or missing data for uniform "' + name + '"', env.commandStr);
      }
      result.value = value;
      UNIFORMS[name] = result;
    });

    Object.keys(dynamicUniforms).forEach(function (key) {
      var dyn = dynamicUniforms[key];
      UNIFORMS[key] = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    });

    return UNIFORMS
  }

  function parseAttributes (attributes, env) {
    var staticAttributes = attributes.static;
    var dynamicAttributes = attributes.dynamic;

    var attributeDefs = {};

    Object.keys(staticAttributes).forEach(function (attribute) {
      var value = staticAttributes[attribute];
      var id = stringStore.id(attribute);

      var record = new AttributeRecord();
      if (isBufferArgs(value)) {
        record.state = ATTRIB_STATE_POINTER;
        record.buffer = bufferState.getBuffer(
          bufferState.create(value, GL_ARRAY_BUFFER$1, false, true));
        record.type = 0;
      } else {
        var buffer = bufferState.getBuffer(value);
        if (buffer) {
          record.state = ATTRIB_STATE_POINTER;
          record.buffer = buffer;
          record.type = 0;
        } else {
          check$1.command(typeof value === 'object' && value,
            'invalid data for attribute ' + attribute, env.commandStr);
          if ('constant' in value) {
            var constant = value.constant;
            record.buffer = 'null';
            record.state = ATTRIB_STATE_CONSTANT;
            if (typeof constant === 'number') {
              record.x = constant;
            } else {
              check$1.command(
                isArrayLike(constant) &&
                constant.length > 0 &&
                constant.length <= 4,
                'invalid constant for attribute ' + attribute, env.commandStr);
              CUTE_COMPONENTS.forEach(function (c, i) {
                if (i < constant.length) {
                  record[c] = constant[i];
                }
              });
            }
          } else {
            if (isBufferArgs(value.buffer)) {
              buffer = bufferState.getBuffer(
                bufferState.create(value.buffer, GL_ARRAY_BUFFER$1, false, true));
            } else {
              buffer = bufferState.getBuffer(value.buffer);
            }
            check$1.command(!!buffer, 'missing buffer for attribute "' + attribute + '"', env.commandStr);

            var offset = value.offset | 0;
            check$1.command(offset >= 0,
              'invalid offset for attribute "' + attribute + '"', env.commandStr);

            var stride = value.stride | 0;
            check$1.command(stride >= 0 && stride < 256,
              'invalid stride for attribute "' + attribute + '", must be integer betweeen [0, 255]', env.commandStr);

            var size = value.size | 0;
            check$1.command(!('size' in value) || (size > 0 && size <= 4),
              'invalid size for attribute "' + attribute + '", must be 1,2,3,4', env.commandStr);

            var normalized = !!value.normalized;

            var type = 0;
            if ('type' in value) {
              check$1.commandParameter(
                value.type, glTypes,
                'invalid type for attribute ' + attribute, env.commandStr);
              type = glTypes[value.type];
            }

            var divisor = value.divisor | 0;
            if ('divisor' in value) {
              check$1.command(divisor === 0 || extInstancing,
                'cannot specify divisor for attribute "' + attribute + '", instancing not supported', env.commandStr);
              check$1.command(divisor >= 0,
                'invalid divisor for attribute "' + attribute + '"', env.commandStr);
            }

            check$1.optional(function () {
              var command = env.commandStr;

              var VALID_KEYS = [
                'buffer',
                'offset',
                'divisor',
                'normalized',
                'type',
                'size',
                'stride'
              ];

              Object.keys(value).forEach(function (prop) {
                check$1.command(
                  VALID_KEYS.indexOf(prop) >= 0,
                  'unknown parameter "' + prop + '" for attribute pointer "' + attribute + '" (valid parameters are ' + VALID_KEYS + ')',
                  command);
              });
            });

            record.buffer = buffer;
            record.state = ATTRIB_STATE_POINTER;
            record.size = size;
            record.normalized = normalized;
            record.type = type || buffer.dtype;
            record.offset = offset;
            record.stride = stride;
            record.divisor = divisor;
          }
        }
      }

      attributeDefs[attribute] = createStaticDecl(function (env, scope) {
        var cache = env.attribCache;
        if (id in cache) {
          return cache[id]
        }
        var result = {
          isStream: false
        };
        Object.keys(record).forEach(function (key) {
          result[key] = record[key];
        });
        if (record.buffer) {
          result.buffer = env.link(record.buffer);
          result.type = result.type || (result.buffer + '.dtype');
        }
        cache[id] = result;
        return result
      });
    });

    Object.keys(dynamicAttributes).forEach(function (attribute) {
      var dyn = dynamicAttributes[attribute];

      function appendAttributeCode (env, block) {
        var VALUE = env.invoke(block, dyn);

        var shared = env.shared;

        var IS_BUFFER_ARGS = shared.isBufferArgs;
        var BUFFER_STATE = shared.buffer;

        // Perform validation on attribute
        check$1.optional(function () {
          env.assert(block,
            VALUE + '&&(typeof ' + VALUE + '==="object"||typeof ' +
            VALUE + '==="function")&&(' +
            IS_BUFFER_ARGS + '(' + VALUE + ')||' +
            BUFFER_STATE + '.getBuffer(' + VALUE + ')||' +
            BUFFER_STATE + '.getBuffer(' + VALUE + '.buffer)||' +
            IS_BUFFER_ARGS + '(' + VALUE + '.buffer)||' +
            '("constant" in ' + VALUE +
            '&&(typeof ' + VALUE + '.constant==="number"||' +
            shared.isArrayLike + '(' + VALUE + '.constant))))',
            'invalid dynamic attribute "' + attribute + '"');
        });

        // allocate names for result
        var result = {
          isStream: block.def(false)
        };
        var defaultRecord = new AttributeRecord();
        defaultRecord.state = ATTRIB_STATE_POINTER;
        Object.keys(defaultRecord).forEach(function (key) {
          result[key] = block.def('' + defaultRecord[key]);
        });

        var BUFFER = result.buffer;
        var TYPE = result.type;
        block(
          'if(', IS_BUFFER_ARGS, '(', VALUE, ')){',
          result.isStream, '=true;',
          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$1, ',', VALUE, ');',
          TYPE, '=', BUFFER, '.dtype;',
          '}else{',
          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, ');',
          'if(', BUFFER, '){',
          TYPE, '=', BUFFER, '.dtype;',
          '}else if("constant" in ', VALUE, '){',
          result.state, '=', ATTRIB_STATE_CONSTANT, ';',
          'if(typeof ' + VALUE + '.constant === "number"){',
          result[CUTE_COMPONENTS[0]], '=', VALUE, '.constant;',
          CUTE_COMPONENTS.slice(1).map(function (n) {
            return result[n]
          }).join('='), '=0;',
          '}else{',
          CUTE_COMPONENTS.map(function (name, i) {
            return (
              result[name] + '=' + VALUE + '.constant.length>' + i +
              '?' + VALUE + '.constant[' + i + ']:0;'
            )
          }).join(''),
          '}}else{',
          'if(', IS_BUFFER_ARGS, '(', VALUE, '.buffer)){',
          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$1, ',', VALUE, '.buffer);',
          '}else{',
          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, '.buffer);',
          '}',
          TYPE, '="type" in ', VALUE, '?',
          shared.glTypes, '[', VALUE, '.type]:', BUFFER, '.dtype;',
          result.normalized, '=!!', VALUE, '.normalized;');
        function emitReadRecord (name) {
          block(result[name], '=', VALUE, '.', name, '|0;');
        }
        emitReadRecord('size');
        emitReadRecord('offset');
        emitReadRecord('stride');
        emitReadRecord('divisor');

        block('}}');

        block.exit(
          'if(', result.isStream, '){',
          BUFFER_STATE, '.destroyStream(', BUFFER, ');',
          '}');

        return result
      }

      attributeDefs[attribute] = createDynamicDecl(dyn, appendAttributeCode);
    });

    return attributeDefs
  }

  function parseContext (context) {
    var staticContext = context.static;
    var dynamicContext = context.dynamic;
    var result = {};

    Object.keys(staticContext).forEach(function (name) {
      var value = staticContext[name];
      result[name] = createStaticDecl(function (env, scope) {
        if (typeof value === 'number' || typeof value === 'boolean') {
          return '' + value
        } else {
          return env.link(value)
        }
      });
    });

    Object.keys(dynamicContext).forEach(function (name) {
      var dyn = dynamicContext[name];
      result[name] = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    });

    return result
  }

  function parseArguments (options, attributes, uniforms, context, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    check$1.optional(function () {
      var KEY_NAMES = [
        S_FRAMEBUFFER,
        S_VERT,
        S_FRAG,
        S_ELEMENTS,
        S_PRIMITIVE,
        S_OFFSET,
        S_COUNT,
        S_INSTANCES,
        S_PROFILE
      ].concat(GL_STATE_NAMES);

      function checkKeys (dict) {
        Object.keys(dict).forEach(function (key) {
          check$1.command(
            KEY_NAMES.indexOf(key) >= 0,
            'unknown parameter "' + key + '"',
            env.commandStr);
        });
      }

      checkKeys(staticOptions);
      checkKeys(dynamicOptions);
    });

    var framebuffer = parseFramebuffer(options, env);
    var viewportAndScissor = parseViewportScissor(options, framebuffer, env);
    var draw = parseDraw(options, env);
    var state = parseGLState(options, env);
    var shader = parseProgram(options, env);

    function copyBox (name) {
      var defn = viewportAndScissor[name];
      if (defn) {
        state[name] = defn;
      }
    }
    copyBox(S_VIEWPORT);
    copyBox(propName(S_SCISSOR_BOX));

    var dirty = Object.keys(state).length > 0;

    var result = {
      framebuffer: framebuffer,
      draw: draw,
      shader: shader,
      state: state,
      dirty: dirty
    };

    result.profile = parseProfile(options, env);
    result.uniforms = parseUniforms(uniforms, env);
    result.attributes = parseAttributes(attributes, env);
    result.context = parseContext(context, env);
    return result
  }

  // ===================================================
  // ===================================================
  // COMMON UPDATE FUNCTIONS
  // ===================================================
  // ===================================================
  function emitContext (env, scope, context) {
    var shared = env.shared;
    var CONTEXT = shared.context;

    var contextEnter = env.scope();

    Object.keys(context).forEach(function (name) {
      scope.save(CONTEXT, '.' + name);
      var defn = context[name];
      contextEnter(CONTEXT, '.', name, '=', defn.append(env, scope), ';');
    });

    scope(contextEnter);
  }

  // ===================================================
  // ===================================================
  // COMMON DRAWING FUNCTIONS
  // ===================================================
  // ===================================================
  function emitPollFramebuffer (env, scope, framebuffer, skipCheck) {
    var shared = env.shared;

    var GL = shared.gl;
    var FRAMEBUFFER_STATE = shared.framebuffer;
    var EXT_DRAW_BUFFERS;
    if (extDrawBuffers) {
      EXT_DRAW_BUFFERS = scope.def(shared.extensions, '.webgl_draw_buffers');
    }

    var constants = env.constants;

    var DRAW_BUFFERS = constants.drawBuffer;
    var BACK_BUFFER = constants.backBuffer;

    var NEXT;
    if (framebuffer) {
      NEXT = framebuffer.append(env, scope);
    } else {
      NEXT = scope.def(FRAMEBUFFER_STATE, '.next');
    }

    if (!skipCheck) {
      scope('if(', NEXT, '!==', FRAMEBUFFER_STATE, '.cur){');
    }
    scope(
      'if(', NEXT, '){',
      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$2, ',', NEXT, '.framebuffer);');
    if (extDrawBuffers) {
      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(',
        DRAW_BUFFERS, '[', NEXT, '.colorAttachments.length]);');
    }
    scope('}else{',
      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$2, ',null);');
    if (extDrawBuffers) {
      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(', BACK_BUFFER, ');');
    }
    scope(
      '}',
      FRAMEBUFFER_STATE, '.cur=', NEXT, ';');
    if (!skipCheck) {
      scope('}');
    }
  }

  function emitPollState (env, scope, args) {
    var shared = env.shared;

    var GL = shared.gl;

    var CURRENT_VARS = env.current;
    var NEXT_VARS = env.next;
    var CURRENT_STATE = shared.current;
    var NEXT_STATE = shared.next;

    var block = env.cond(CURRENT_STATE, '.dirty');

    GL_STATE_NAMES.forEach(function (prop) {
      var param = propName(prop);
      if (param in args.state) {
        return
      }

      var NEXT, CURRENT;
      if (param in NEXT_VARS) {
        NEXT = NEXT_VARS[param];
        CURRENT = CURRENT_VARS[param];
        var parts = loop(currentState[param].length, function (i) {
          return block.def(NEXT, '[', i, ']')
        });
        block(env.cond(parts.map(function (p, i) {
          return p + '!==' + CURRENT + '[' + i + ']'
        }).join('||'))
          .then(
            GL, '.', GL_VARIABLES[param], '(', parts, ');',
            parts.map(function (p, i) {
              return CURRENT + '[' + i + ']=' + p
            }).join(';'), ';'));
      } else {
        NEXT = block.def(NEXT_STATE, '.', param);
        var ifte = env.cond(NEXT, '!==', CURRENT_STATE, '.', param);
        block(ifte);
        if (param in GL_FLAGS) {
          ifte(
            env.cond(NEXT)
                .then(GL, '.enable(', GL_FLAGS[param], ');')
                .else(GL, '.disable(', GL_FLAGS[param], ');'),
            CURRENT_STATE, '.', param, '=', NEXT, ';');
        } else {
          ifte(
            GL, '.', GL_VARIABLES[param], '(', NEXT, ');',
            CURRENT_STATE, '.', param, '=', NEXT, ';');
        }
      }
    });
    if (Object.keys(args.state).length === 0) {
      block(CURRENT_STATE, '.dirty=false;');
    }
    scope(block);
  }

  function emitSetOptions (env, scope, options, filter) {
    var shared = env.shared;
    var CURRENT_VARS = env.current;
    var CURRENT_STATE = shared.current;
    var GL = shared.gl;
    sortState(Object.keys(options)).forEach(function (param) {
      var defn = options[param];
      if (filter && !filter(defn)) {
        return
      }
      var variable = defn.append(env, scope);
      if (GL_FLAGS[param]) {
        var flag = GL_FLAGS[param];
        if (isStatic(defn)) {
          if (variable) {
            scope(GL, '.enable(', flag, ');');
          } else {
            scope(GL, '.disable(', flag, ');');
          }
        } else {
          scope(env.cond(variable)
            .then(GL, '.enable(', flag, ');')
            .else(GL, '.disable(', flag, ');'));
        }
        scope(CURRENT_STATE, '.', param, '=', variable, ';');
      } else if (isArrayLike(variable)) {
        var CURRENT = CURRENT_VARS[param];
        scope(
          GL, '.', GL_VARIABLES[param], '(', variable, ');',
          variable.map(function (v, i) {
            return CURRENT + '[' + i + ']=' + v
          }).join(';'), ';');
      } else {
        scope(
          GL, '.', GL_VARIABLES[param], '(', variable, ');',
          CURRENT_STATE, '.', param, '=', variable, ';');
      }
    });
  }

  function injectExtensions (env, scope) {
    if (extInstancing) {
      env.instancing = scope.def(
        env.shared.extensions, '.angle_instanced_arrays');
    }
  }

  function emitProfile (env, scope, args, useScope, incrementCounter) {
    var shared = env.shared;
    var STATS = env.stats;
    var CURRENT_STATE = shared.current;
    var TIMER = shared.timer;
    var profileArg = args.profile;

    function perfCounter () {
      if (typeof performance === 'undefined') {
        return 'Date.now()'
      } else {
        return 'performance.now()'
      }
    }

    var CPU_START, QUERY_COUNTER;
    function emitProfileStart (block) {
      CPU_START = scope.def();
      block(CPU_START, '=', perfCounter(), ';');
      if (typeof incrementCounter === 'string') {
        block(STATS, '.count+=', incrementCounter, ';');
      } else {
        block(STATS, '.count++;');
      }
      if (timer) {
        if (useScope) {
          QUERY_COUNTER = scope.def();
          block(QUERY_COUNTER, '=', TIMER, '.getNumPendingQueries();');
        } else {
          block(TIMER, '.beginQuery(', STATS, ');');
        }
      }
    }

    function emitProfileEnd (block) {
      block(STATS, '.cpuTime+=', perfCounter(), '-', CPU_START, ';');
      if (timer) {
        if (useScope) {
          block(TIMER, '.pushScopeStats(',
            QUERY_COUNTER, ',',
            TIMER, '.getNumPendingQueries(),',
            STATS, ');');
        } else {
          block(TIMER, '.endQuery();');
        }
      }
    }

    function scopeProfile (value) {
      var prev = scope.def(CURRENT_STATE, '.profile');
      scope(CURRENT_STATE, '.profile=', value, ';');
      scope.exit(CURRENT_STATE, '.profile=', prev, ';');
    }

    var USE_PROFILE;
    if (profileArg) {
      if (isStatic(profileArg)) {
        if (profileArg.enable) {
          emitProfileStart(scope);
          emitProfileEnd(scope.exit);
          scopeProfile('true');
        } else {
          scopeProfile('false');
        }
        return
      }
      USE_PROFILE = profileArg.append(env, scope);
      scopeProfile(USE_PROFILE);
    } else {
      USE_PROFILE = scope.def(CURRENT_STATE, '.profile');
    }

    var start = env.block();
    emitProfileStart(start);
    scope('if(', USE_PROFILE, '){', start, '}');
    var end = env.block();
    emitProfileEnd(end);
    scope.exit('if(', USE_PROFILE, '){', end, '}');
  }

  function emitAttributes (env, scope, args, attributes, filter) {
    var shared = env.shared;

    function typeLength (x) {
      switch (x) {
        case GL_FLOAT_VEC2:
        case GL_INT_VEC2:
        case GL_BOOL_VEC2:
          return 2
        case GL_FLOAT_VEC3:
        case GL_INT_VEC3:
        case GL_BOOL_VEC3:
          return 3
        case GL_FLOAT_VEC4:
        case GL_INT_VEC4:
        case GL_BOOL_VEC4:
          return 4
        default:
          return 1
      }
    }

    function emitBindAttribute (ATTRIBUTE, size, record) {
      var GL = shared.gl;

      var LOCATION = scope.def(ATTRIBUTE, '.location');
      var BINDING = scope.def(shared.attributes, '[', LOCATION, ']');

      var STATE = record.state;
      var BUFFER = record.buffer;
      var CONST_COMPONENTS = [
        record.x,
        record.y,
        record.z,
        record.w
      ];

      var COMMON_KEYS = [
        'buffer',
        'normalized',
        'offset',
        'stride'
      ];

      function emitBuffer () {
        scope(
          'if(!', BINDING, '.buffer){',
          GL, '.enableVertexAttribArray(', LOCATION, ');}');

        var TYPE = record.type;
        var SIZE;
        if (!record.size) {
          SIZE = size;
        } else {
          SIZE = scope.def(record.size, '||', size);
        }

        scope('if(',
          BINDING, '.type!==', TYPE, '||',
          BINDING, '.size!==', SIZE, '||',
          COMMON_KEYS.map(function (key) {
            return BINDING + '.' + key + '!==' + record[key]
          }).join('||'),
          '){',
          GL, '.bindBuffer(', GL_ARRAY_BUFFER$1, ',', BUFFER, '.buffer);',
          GL, '.vertexAttribPointer(', [
            LOCATION,
            SIZE,
            TYPE,
            record.normalized,
            record.stride,
            record.offset
          ], ');',
          BINDING, '.type=', TYPE, ';',
          BINDING, '.size=', SIZE, ';',
          COMMON_KEYS.map(function (key) {
            return BINDING + '.' + key + '=' + record[key] + ';'
          }).join(''),
          '}');

        if (extInstancing) {
          var DIVISOR = record.divisor;
          scope(
            'if(', BINDING, '.divisor!==', DIVISOR, '){',
            env.instancing, '.vertexAttribDivisorANGLE(', [LOCATION, DIVISOR], ');',
            BINDING, '.divisor=', DIVISOR, ';}');
        }
      }

      function emitConstant () {
        scope(
          'if(', BINDING, '.buffer){',
          GL, '.disableVertexAttribArray(', LOCATION, ');',
          '}if(', CUTE_COMPONENTS.map(function (c, i) {
            return BINDING + '.' + c + '!==' + CONST_COMPONENTS[i]
          }).join('||'), '){',
          GL, '.vertexAttrib4f(', LOCATION, ',', CONST_COMPONENTS, ');',
          CUTE_COMPONENTS.map(function (c, i) {
            return BINDING + '.' + c + '=' + CONST_COMPONENTS[i] + ';'
          }).join(''),
          '}');
      }

      if (STATE === ATTRIB_STATE_POINTER) {
        emitBuffer();
      } else if (STATE === ATTRIB_STATE_CONSTANT) {
        emitConstant();
      } else {
        scope('if(', STATE, '===', ATTRIB_STATE_POINTER, '){');
        emitBuffer();
        scope('}else{');
        emitConstant();
        scope('}');
      }
    }

    attributes.forEach(function (attribute) {
      var name = attribute.name;
      var arg = args.attributes[name];
      var record;
      if (arg) {
        if (!filter(arg)) {
          return
        }
        record = arg.append(env, scope);
      } else {
        if (!filter(SCOPE_DECL)) {
          return
        }
        var scopeAttrib = env.scopeAttrib(name);
        check$1.optional(function () {
          env.assert(scope,
            scopeAttrib + '.state',
            'missing attribute ' + name);
        });
        record = {};
        Object.keys(new AttributeRecord()).forEach(function (key) {
          record[key] = scope.def(scopeAttrib, '.', key);
        });
      }
      emitBindAttribute(
        env.link(attribute), typeLength(attribute.info.type), record);
    });
  }

  function emitUniforms (env, scope, args, uniforms, filter) {
    var shared = env.shared;
    var GL = shared.gl;

    var infix;
    for (var i = 0; i < uniforms.length; ++i) {
      var uniform = uniforms[i];
      var name = uniform.name;
      var type = uniform.info.type;
      var arg = args.uniforms[name];
      var UNIFORM = env.link(uniform);
      var LOCATION = UNIFORM + '.location';

      var VALUE;
      if (arg) {
        if (!filter(arg)) {
          continue
        }
        if (isStatic(arg)) {
          var value = arg.value;
          check$1.command(
            value !== null && typeof value !== 'undefined',
            'missing uniform "' + name + '"', env.commandStr);
          if (type === GL_SAMPLER_2D || type === GL_SAMPLER_CUBE) {
            check$1.command(
              typeof value === 'function' &&
              ((type === GL_SAMPLER_2D &&
                (value._reglType === 'texture2d' ||
                value._reglType === 'framebuffer')) ||
              (type === GL_SAMPLER_CUBE &&
                (value._reglType === 'textureCube' ||
                value._reglType === 'framebufferCube'))),
              'invalid texture for uniform ' + name, env.commandStr);
            var TEX_VALUE = env.link(value._texture || value.color[0]._texture);
            scope(GL, '.uniform1i(', LOCATION, ',', TEX_VALUE + '.bind());');
            scope.exit(TEX_VALUE, '.unbind();');
          } else if (
            type === GL_FLOAT_MAT2 ||
            type === GL_FLOAT_MAT3 ||
            type === GL_FLOAT_MAT4) {
            check$1.optional(function () {
              check$1.command(isArrayLike(value),
                'invalid matrix for uniform ' + name, env.commandStr);
              check$1.command(
                (type === GL_FLOAT_MAT2 && value.length === 4) ||
                (type === GL_FLOAT_MAT3 && value.length === 9) ||
                (type === GL_FLOAT_MAT4 && value.length === 16),
                'invalid length for matrix uniform ' + name, env.commandStr);
            });
            var MAT_VALUE = env.global.def('new Float32Array([' +
              Array.prototype.slice.call(value) + '])');
            var dim = 2;
            if (type === GL_FLOAT_MAT3) {
              dim = 3;
            } else if (type === GL_FLOAT_MAT4) {
              dim = 4;
            }
            scope(
              GL, '.uniformMatrix', dim, 'fv(',
              LOCATION, ',false,', MAT_VALUE, ');');
          } else {
            switch (type) {
              case GL_FLOAT$8:
                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
                infix = '1f';
                break
              case GL_FLOAT_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2f';
                break
              case GL_FLOAT_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3f';
                break
              case GL_FLOAT_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4f';
                break
              case GL_BOOL:
                check$1.commandType(value, 'boolean', 'uniform ' + name, env.commandStr);
                infix = '1i';
                break
              case GL_INT$3:
                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
                infix = '1i';
                break
              case GL_BOOL_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2i';
                break
              case GL_INT_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2i';
                break
              case GL_BOOL_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3i';
                break
              case GL_INT_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3i';
                break
              case GL_BOOL_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4i';
                break
              case GL_INT_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4i';
                break
            }
            scope(GL, '.uniform', infix, '(', LOCATION, ',',
              isArrayLike(value) ? Array.prototype.slice.call(value) : value,
              ');');
          }
          continue
        } else {
          VALUE = arg.append(env, scope);
        }
      } else {
        if (!filter(SCOPE_DECL)) {
          continue
        }
        VALUE = scope.def(shared.uniforms, '[', stringStore.id(name), ']');
      }

      if (type === GL_SAMPLER_2D) {
        scope(
          'if(', VALUE, '&&', VALUE, '._reglType==="framebuffer"){',
          VALUE, '=', VALUE, '.color[0];',
          '}');
      } else if (type === GL_SAMPLER_CUBE) {
        scope(
          'if(', VALUE, '&&', VALUE, '._reglType==="framebufferCube"){',
          VALUE, '=', VALUE, '.color[0];',
          '}');
      }

      // perform type validation
      check$1.optional(function () {
        function check (pred, message) {
          env.assert(scope, pred,
            'bad data or missing for uniform "' + name + '".  ' + message);
        }

        function checkType (type) {
          check(
            'typeof ' + VALUE + '==="' + type + '"',
            'invalid type, expected ' + type);
        }

        function checkVector (n, type) {
          check(
            shared.isArrayLike + '(' + VALUE + ')&&' + VALUE + '.length===' + n,
            'invalid vector, should have length ' + n, env.commandStr);
        }

        function checkTexture (target) {
          check(
            'typeof ' + VALUE + '==="function"&&' +
            VALUE + '._reglType==="texture' +
            (target === GL_TEXTURE_2D$3 ? '2d' : 'Cube') + '"',
            'invalid texture type', env.commandStr);
        }

        switch (type) {
          case GL_INT$3:
            checkType('number');
            break
          case GL_INT_VEC2:
            checkVector(2, 'number');
            break
          case GL_INT_VEC3:
            checkVector(3, 'number');
            break
          case GL_INT_VEC4:
            checkVector(4, 'number');
            break
          case GL_FLOAT$8:
            checkType('number');
            break
          case GL_FLOAT_VEC2:
            checkVector(2, 'number');
            break
          case GL_FLOAT_VEC3:
            checkVector(3, 'number');
            break
          case GL_FLOAT_VEC4:
            checkVector(4, 'number');
            break
          case GL_BOOL:
            checkType('boolean');
            break
          case GL_BOOL_VEC2:
            checkVector(2, 'boolean');
            break
          case GL_BOOL_VEC3:
            checkVector(3, 'boolean');
            break
          case GL_BOOL_VEC4:
            checkVector(4, 'boolean');
            break
          case GL_FLOAT_MAT2:
            checkVector(4, 'number');
            break
          case GL_FLOAT_MAT3:
            checkVector(9, 'number');
            break
          case GL_FLOAT_MAT4:
            checkVector(16, 'number');
            break
          case GL_SAMPLER_2D:
            checkTexture(GL_TEXTURE_2D$3);
            break
          case GL_SAMPLER_CUBE:
            checkTexture(GL_TEXTURE_CUBE_MAP$2);
            break
        }
      });

      var unroll = 1;
      switch (type) {
        case GL_SAMPLER_2D:
        case GL_SAMPLER_CUBE:
          var TEX = scope.def(VALUE, '._texture');
          scope(GL, '.uniform1i(', LOCATION, ',', TEX, '.bind());');
          scope.exit(TEX, '.unbind();');
          continue

        case GL_INT$3:
        case GL_BOOL:
          infix = '1i';
          break

        case GL_INT_VEC2:
        case GL_BOOL_VEC2:
          infix = '2i';
          unroll = 2;
          break

        case GL_INT_VEC3:
        case GL_BOOL_VEC3:
          infix = '3i';
          unroll = 3;
          break

        case GL_INT_VEC4:
        case GL_BOOL_VEC4:
          infix = '4i';
          unroll = 4;
          break

        case GL_FLOAT$8:
          infix = '1f';
          break

        case GL_FLOAT_VEC2:
          infix = '2f';
          unroll = 2;
          break

        case GL_FLOAT_VEC3:
          infix = '3f';
          unroll = 3;
          break

        case GL_FLOAT_VEC4:
          infix = '4f';
          unroll = 4;
          break

        case GL_FLOAT_MAT2:
          infix = 'Matrix2fv';
          break

        case GL_FLOAT_MAT3:
          infix = 'Matrix3fv';
          break

        case GL_FLOAT_MAT4:
          infix = 'Matrix4fv';
          break
      }

      scope(GL, '.uniform', infix, '(', LOCATION, ',');
      if (infix.charAt(0) === 'M') {
        var matSize = Math.pow(type - GL_FLOAT_MAT2 + 2, 2);
        var STORAGE = env.global.def('new Float32Array(', matSize, ')');
        scope(
          'false,(Array.isArray(', VALUE, ')||', VALUE, ' instanceof Float32Array)?', VALUE, ':(',
          loop(matSize, function (i) {
            return STORAGE + '[' + i + ']=' + VALUE + '[' + i + ']'
          }), ',', STORAGE, ')');
      } else if (unroll > 1) {
        scope(loop(unroll, function (i) {
          return VALUE + '[' + i + ']'
        }));
      } else {
        scope(VALUE);
      }
      scope(');');
    }
  }

  function emitDraw (env, outer, inner, args) {
    var shared = env.shared;
    var GL = shared.gl;
    var DRAW_STATE = shared.draw;

    var drawOptions = args.draw;

    function emitElements () {
      var defn = drawOptions.elements;
      var ELEMENTS;
      var scope = outer;
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          scope = inner;
        }
        ELEMENTS = defn.append(env, scope);
      } else {
        ELEMENTS = scope.def(DRAW_STATE, '.', S_ELEMENTS);
      }
      if (ELEMENTS) {
        scope(
          'if(' + ELEMENTS + ')' +
          GL + '.bindBuffer(' + GL_ELEMENT_ARRAY_BUFFER$1 + ',' + ELEMENTS + '.buffer.buffer);');
      }
      return ELEMENTS
    }

    function emitCount () {
      var defn = drawOptions.count;
      var COUNT;
      var scope = outer;
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          scope = inner;
        }
        COUNT = defn.append(env, scope);
        check$1.optional(function () {
          if (defn.MISSING) {
            env.assert(outer, 'false', 'missing vertex count');
          }
          if (defn.DYNAMIC) {
            env.assert(scope, COUNT + '>=0', 'missing vertex count');
          }
        });
      } else {
        COUNT = scope.def(DRAW_STATE, '.', S_COUNT);
        check$1.optional(function () {
          env.assert(scope, COUNT + '>=0', 'missing vertex count');
        });
      }
      return COUNT
    }

    var ELEMENTS = emitElements();
    function emitValue (name) {
      var defn = drawOptions[name];
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          return defn.append(env, inner)
        } else {
          return defn.append(env, outer)
        }
      } else {
        return outer.def(DRAW_STATE, '.', name)
      }
    }

    var PRIMITIVE = emitValue(S_PRIMITIVE);
    var OFFSET = emitValue(S_OFFSET);

    var COUNT = emitCount();
    if (typeof COUNT === 'number') {
      if (COUNT === 0) {
        return
      }
    } else {
      inner('if(', COUNT, '){');
      inner.exit('}');
    }

    var INSTANCES, EXT_INSTANCING;
    if (extInstancing) {
      INSTANCES = emitValue(S_INSTANCES);
      EXT_INSTANCING = env.instancing;
    }

    var ELEMENT_TYPE = ELEMENTS + '.type';

    var elementsStatic = drawOptions.elements && isStatic(drawOptions.elements);

    function emitInstancing () {
      function drawElements () {
        inner(EXT_INSTANCING, '.drawElementsInstancedANGLE(', [
          PRIMITIVE,
          COUNT,
          ELEMENT_TYPE,
          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$8 + ')>>1)',
          INSTANCES
        ], ');');
      }

      function drawArrays () {
        inner(EXT_INSTANCING, '.drawArraysInstancedANGLE(',
          [PRIMITIVE, OFFSET, COUNT, INSTANCES], ');');
      }

      if (ELEMENTS) {
        if (!elementsStatic) {
          inner('if(', ELEMENTS, '){');
          drawElements();
          inner('}else{');
          drawArrays();
          inner('}');
        } else {
          drawElements();
        }
      } else {
        drawArrays();
      }
    }

    function emitRegular () {
      function drawElements () {
        inner(GL + '.drawElements(' + [
          PRIMITIVE,
          COUNT,
          ELEMENT_TYPE,
          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$8 + ')>>1)'
        ] + ');');
      }

      function drawArrays () {
        inner(GL + '.drawArrays(' + [PRIMITIVE, OFFSET, COUNT] + ');');
      }

      if (ELEMENTS) {
        if (!elementsStatic) {
          inner('if(', ELEMENTS, '){');
          drawElements();
          inner('}else{');
          drawArrays();
          inner('}');
        } else {
          drawElements();
        }
      } else {
        drawArrays();
      }
    }

    if (extInstancing && (typeof INSTANCES !== 'number' || INSTANCES >= 0)) {
      if (typeof INSTANCES === 'string') {
        inner('if(', INSTANCES, '>0){');
        emitInstancing();
        inner('}else if(', INSTANCES, '<0){');
        emitRegular();
        inner('}');
      } else {
        emitInstancing();
      }
    } else {
      emitRegular();
    }
  }

  function createBody (emitBody, parentEnv, args, program, count) {
    var env = createREGLEnvironment();
    var scope = env.proc('body', count);
    check$1.optional(function () {
      env.commandStr = parentEnv.commandStr;
      env.command = env.link(parentEnv.commandStr);
    });
    if (extInstancing) {
      env.instancing = scope.def(
        env.shared.extensions, '.angle_instanced_arrays');
    }
    emitBody(env, scope, args, program);
    return env.compile().body
  }

  // ===================================================
  // ===================================================
  // DRAW PROC
  // ===================================================
  // ===================================================
  function emitDrawBody (env, draw, args, program) {
    injectExtensions(env, draw);
    emitAttributes(env, draw, args, program.attributes, function () {
      return true
    });
    emitUniforms(env, draw, args, program.uniforms, function () {
      return true
    });
    emitDraw(env, draw, draw, args);
  }

  function emitDrawProc (env, args) {
    var draw = env.proc('draw', 1);

    injectExtensions(env, draw);

    emitContext(env, draw, args.context);
    emitPollFramebuffer(env, draw, args.framebuffer);

    emitPollState(env, draw, args);
    emitSetOptions(env, draw, args.state);

    emitProfile(env, draw, args, false, true);

    var program = args.shader.progVar.append(env, draw);
    draw(env.shared.gl, '.useProgram(', program, '.program);');

    if (args.shader.program) {
      emitDrawBody(env, draw, args, args.shader.program);
    } else {
      var drawCache = env.global.def('{}');
      var PROG_ID = draw.def(program, '.id');
      var CACHED_PROC = draw.def(drawCache, '[', PROG_ID, ']');
      draw(
        env.cond(CACHED_PROC)
          .then(CACHED_PROC, '.call(this,a0);')
          .else(
            CACHED_PROC, '=', drawCache, '[', PROG_ID, ']=',
            env.link(function (program) {
              return createBody(emitDrawBody, env, args, program, 1)
            }), '(', program, ');',
            CACHED_PROC, '.call(this,a0);'));
    }

    if (Object.keys(args.state).length > 0) {
      draw(env.shared.current, '.dirty=true;');
    }
  }

  // ===================================================
  // ===================================================
  // BATCH PROC
  // ===================================================
  // ===================================================

  function emitBatchDynamicShaderBody (env, scope, args, program) {
    env.batchId = 'a1';

    injectExtensions(env, scope);

    function all () {
      return true
    }

    emitAttributes(env, scope, args, program.attributes, all);
    emitUniforms(env, scope, args, program.uniforms, all);
    emitDraw(env, scope, scope, args);
  }

  function emitBatchBody (env, scope, args, program) {
    injectExtensions(env, scope);

    var contextDynamic = args.contextDep;

    var BATCH_ID = scope.def();
    var PROP_LIST = 'a0';
    var NUM_PROPS = 'a1';
    var PROPS = scope.def();
    env.shared.props = PROPS;
    env.batchId = BATCH_ID;

    var outer = env.scope();
    var inner = env.scope();

    scope(
      outer.entry,
      'for(', BATCH_ID, '=0;', BATCH_ID, '<', NUM_PROPS, ';++', BATCH_ID, '){',
      PROPS, '=', PROP_LIST, '[', BATCH_ID, '];',
      inner,
      '}',
      outer.exit);

    function isInnerDefn (defn) {
      return ((defn.contextDep && contextDynamic) || defn.propDep)
    }

    function isOuterDefn (defn) {
      return !isInnerDefn(defn)
    }

    if (args.needsContext) {
      emitContext(env, inner, args.context);
    }
    if (args.needsFramebuffer) {
      emitPollFramebuffer(env, inner, args.framebuffer);
    }
    emitSetOptions(env, inner, args.state, isInnerDefn);

    if (args.profile && isInnerDefn(args.profile)) {
      emitProfile(env, inner, args, false, true);
    }

    if (!program) {
      var progCache = env.global.def('{}');
      var PROGRAM = args.shader.progVar.append(env, inner);
      var PROG_ID = inner.def(PROGRAM, '.id');
      var CACHED_PROC = inner.def(progCache, '[', PROG_ID, ']');
      inner(
        env.shared.gl, '.useProgram(', PROGRAM, '.program);',
        'if(!', CACHED_PROC, '){',
        CACHED_PROC, '=', progCache, '[', PROG_ID, ']=',
        env.link(function (program) {
          return createBody(
            emitBatchDynamicShaderBody, env, args, program, 2)
        }), '(', PROGRAM, ');}',
        CACHED_PROC, '.call(this,a0[', BATCH_ID, '],', BATCH_ID, ');');
    } else {
      emitAttributes(env, outer, args, program.attributes, isOuterDefn);
      emitAttributes(env, inner, args, program.attributes, isInnerDefn);
      emitUniforms(env, outer, args, program.uniforms, isOuterDefn);
      emitUniforms(env, inner, args, program.uniforms, isInnerDefn);
      emitDraw(env, outer, inner, args);
    }
  }

  function emitBatchProc (env, args) {
    var batch = env.proc('batch', 2);
    env.batchId = '0';

    injectExtensions(env, batch);

    // Check if any context variables depend on props
    var contextDynamic = false;
    var needsContext = true;
    Object.keys(args.context).forEach(function (name) {
      contextDynamic = contextDynamic || args.context[name].propDep;
    });
    if (!contextDynamic) {
      emitContext(env, batch, args.context);
      needsContext = false;
    }

    // framebuffer state affects framebufferWidth/height context vars
    var framebuffer = args.framebuffer;
    var needsFramebuffer = false;
    if (framebuffer) {
      if (framebuffer.propDep) {
        contextDynamic = needsFramebuffer = true;
      } else if (framebuffer.contextDep && contextDynamic) {
        needsFramebuffer = true;
      }
      if (!needsFramebuffer) {
        emitPollFramebuffer(env, batch, framebuffer);
      }
    } else {
      emitPollFramebuffer(env, batch, null);
    }

    // viewport is weird because it can affect context vars
    if (args.state.viewport && args.state.viewport.propDep) {
      contextDynamic = true;
    }

    function isInnerDefn (defn) {
      return (defn.contextDep && contextDynamic) || defn.propDep
    }

    // set webgl options
    emitPollState(env, batch, args);
    emitSetOptions(env, batch, args.state, function (defn) {
      return !isInnerDefn(defn)
    });

    if (!args.profile || !isInnerDefn(args.profile)) {
      emitProfile(env, batch, args, false, 'a1');
    }

    // Save these values to args so that the batch body routine can use them
    args.contextDep = contextDynamic;
    args.needsContext = needsContext;
    args.needsFramebuffer = needsFramebuffer;

    // determine if shader is dynamic
    var progDefn = args.shader.progVar;
    if ((progDefn.contextDep && contextDynamic) || progDefn.propDep) {
      emitBatchBody(
        env,
        batch,
        args,
        null);
    } else {
      var PROGRAM = progDefn.append(env, batch);
      batch(env.shared.gl, '.useProgram(', PROGRAM, '.program);');
      if (args.shader.program) {
        emitBatchBody(
          env,
          batch,
          args,
          args.shader.program);
      } else {
        var batchCache = env.global.def('{}');
        var PROG_ID = batch.def(PROGRAM, '.id');
        var CACHED_PROC = batch.def(batchCache, '[', PROG_ID, ']');
        batch(
          env.cond(CACHED_PROC)
            .then(CACHED_PROC, '.call(this,a0,a1);')
            .else(
              CACHED_PROC, '=', batchCache, '[', PROG_ID, ']=',
              env.link(function (program) {
                return createBody(emitBatchBody, env, args, program, 2)
              }), '(', PROGRAM, ');',
              CACHED_PROC, '.call(this,a0,a1);'));
      }
    }

    if (Object.keys(args.state).length > 0) {
      batch(env.shared.current, '.dirty=true;');
    }
  }

  // ===================================================
  // ===================================================
  // SCOPE COMMAND
  // ===================================================
  // ===================================================
  function emitScopeProc (env, args) {
    var scope = env.proc('scope', 3);
    env.batchId = 'a2';

    var shared = env.shared;
    var CURRENT_STATE = shared.current;

    emitContext(env, scope, args.context);

    if (args.framebuffer) {
      args.framebuffer.append(env, scope);
    }

    sortState(Object.keys(args.state)).forEach(function (name) {
      var defn = args.state[name];
      var value = defn.append(env, scope);
      if (isArrayLike(value)) {
        value.forEach(function (v, i) {
          scope.set(env.next[name], '[' + i + ']', v);
        });
      } else {
        scope.set(shared.next, '.' + name, value);
      }
    });

    emitProfile(env, scope, args, true, true)

    ;[S_ELEMENTS, S_OFFSET, S_COUNT, S_INSTANCES, S_PRIMITIVE].forEach(
      function (opt) {
        var variable = args.draw[opt];
        if (!variable) {
          return
        }
        scope.set(shared.draw, '.' + opt, '' + variable.append(env, scope));
      });

    Object.keys(args.uniforms).forEach(function (opt) {
      scope.set(
        shared.uniforms,
        '[' + stringStore.id(opt) + ']',
        args.uniforms[opt].append(env, scope));
    });

    Object.keys(args.attributes).forEach(function (name) {
      var record = args.attributes[name].append(env, scope);
      var scopeAttrib = env.scopeAttrib(name);
      Object.keys(new AttributeRecord()).forEach(function (prop) {
        scope.set(scopeAttrib, '.' + prop, record[prop]);
      });
    });

    function saveShader (name) {
      var shader = args.shader[name];
      if (shader) {
        scope.set(shared.shader, '.' + name, shader.append(env, scope));
      }
    }
    saveShader(S_VERT);
    saveShader(S_FRAG);

    if (Object.keys(args.state).length > 0) {
      scope(CURRENT_STATE, '.dirty=true;');
      scope.exit(CURRENT_STATE, '.dirty=true;');
    }

    scope('a1(', env.shared.context, ',a0,', env.batchId, ');');
  }

  function isDynamicObject (object) {
    if (typeof object !== 'object' || isArrayLike(object)) {
      return
    }
    var props = Object.keys(object);
    for (var i = 0; i < props.length; ++i) {
      if (dynamic.isDynamic(object[props[i]])) {
        return true
      }
    }
    return false
  }

  function splatObject (env, options, name) {
    var object = options.static[name];
    if (!object || !isDynamicObject(object)) {
      return
    }

    var globals = env.global;
    var keys = Object.keys(object);
    var thisDep = false;
    var contextDep = false;
    var propDep = false;
    var objectRef = env.global.def('{}');
    keys.forEach(function (key) {
      var value = object[key];
      if (dynamic.isDynamic(value)) {
        if (typeof value === 'function') {
          value = object[key] = dynamic.unbox(value);
        }
        var deps = createDynamicDecl(value, null);
        thisDep = thisDep || deps.thisDep;
        propDep = propDep || deps.propDep;
        contextDep = contextDep || deps.contextDep;
      } else {
        globals(objectRef, '.', key, '=');
        switch (typeof value) {
          case 'number':
            globals(value);
            break
          case 'string':
            globals('"', value, '"');
            break
          case 'object':
            if (Array.isArray(value)) {
              globals('[', value.join(), ']');
            }
            break
          default:
            globals(env.link(value));
            break
        }
        globals(';');
      }
    });

    function appendBlock (env, block) {
      keys.forEach(function (key) {
        var value = object[key];
        if (!dynamic.isDynamic(value)) {
          return
        }
        var ref = env.invoke(block, value);
        block(objectRef, '.', key, '=', ref, ';');
      });
    }

    options.dynamic[name] = new dynamic.DynamicVariable(DYN_THUNK, {
      thisDep: thisDep,
      contextDep: contextDep,
      propDep: propDep,
      ref: objectRef,
      append: appendBlock
    });
    delete options.static[name];
  }

  // ===========================================================================
  // ===========================================================================
  // MAIN DRAW COMMAND
  // ===========================================================================
  // ===========================================================================
  function compileCommand (options, attributes, uniforms, context, stats) {
    var env = createREGLEnvironment();

    // link stats, so that we can easily access it in the program.
    env.stats = env.link(stats);

    // splat options and attributes to allow for dynamic nested properties
    Object.keys(attributes.static).forEach(function (key) {
      splatObject(env, attributes, key);
    });
    NESTED_OPTIONS.forEach(function (name) {
      splatObject(env, options, name);
    });

    var args = parseArguments(options, attributes, uniforms, context, env);

    emitDrawProc(env, args);
    emitScopeProc(env, args);
    emitBatchProc(env, args);

    return env.compile()
  }

  // ===========================================================================
  // ===========================================================================
  // POLL / REFRESH
  // ===========================================================================
  // ===========================================================================
  return {
    next: nextState,
    current: currentState,
    procs: (function () {
      var env = createREGLEnvironment();
      var poll = env.proc('poll');
      var refresh = env.proc('refresh');
      var common = env.block();
      poll(common);
      refresh(common);

      var shared = env.shared;
      var GL = shared.gl;
      var NEXT_STATE = shared.next;
      var CURRENT_STATE = shared.current;

      common(CURRENT_STATE, '.dirty=false;');

      emitPollFramebuffer(env, poll);
      emitPollFramebuffer(env, refresh, null, true);

      // Refresh updates all attribute state changes
      var INSTANCING;
      if (extInstancing) {
        INSTANCING = env.link(extInstancing);
      }
      for (var i = 0; i < limits.maxAttributes; ++i) {
        var BINDING = refresh.def(shared.attributes, '[', i, ']');
        var ifte = env.cond(BINDING, '.buffer');
        ifte.then(
          GL, '.enableVertexAttribArray(', i, ');',
          GL, '.bindBuffer(',
            GL_ARRAY_BUFFER$1, ',',
            BINDING, '.buffer.buffer);',
          GL, '.vertexAttribPointer(',
            i, ',',
            BINDING, '.size,',
            BINDING, '.type,',
            BINDING, '.normalized,',
            BINDING, '.stride,',
            BINDING, '.offset);'
        ).else(
          GL, '.disableVertexAttribArray(', i, ');',
          GL, '.vertexAttrib4f(',
            i, ',',
            BINDING, '.x,',
            BINDING, '.y,',
            BINDING, '.z,',
            BINDING, '.w);',
          BINDING, '.buffer=null;');
        refresh(ifte);
        if (extInstancing) {
          refresh(
            INSTANCING, '.vertexAttribDivisorANGLE(',
            i, ',',
            BINDING, '.divisor);');
        }
      }

      Object.keys(GL_FLAGS).forEach(function (flag) {
        var cap = GL_FLAGS[flag];
        var NEXT = common.def(NEXT_STATE, '.', flag);
        var block = env.block();
        block('if(', NEXT, '){',
          GL, '.enable(', cap, ')}else{',
          GL, '.disable(', cap, ')}',
          CURRENT_STATE, '.', flag, '=', NEXT, ';');
        refresh(block);
        poll(
          'if(', NEXT, '!==', CURRENT_STATE, '.', flag, '){',
          block,
          '}');
      });

      Object.keys(GL_VARIABLES).forEach(function (name) {
        var func = GL_VARIABLES[name];
        var init = currentState[name];
        var NEXT, CURRENT;
        var block = env.block();
        block(GL, '.', func, '(');
        if (isArrayLike(init)) {
          var n = init.length;
          NEXT = env.global.def(NEXT_STATE, '.', name);
          CURRENT = env.global.def(CURRENT_STATE, '.', name);
          block(
            loop(n, function (i) {
              return NEXT + '[' + i + ']'
            }), ');',
            loop(n, function (i) {
              return CURRENT + '[' + i + ']=' + NEXT + '[' + i + '];'
            }).join(''));
          poll(
            'if(', loop(n, function (i) {
              return NEXT + '[' + i + ']!==' + CURRENT + '[' + i + ']'
            }).join('||'), '){',
            block,
            '}');
        } else {
          NEXT = common.def(NEXT_STATE, '.', name);
          CURRENT = common.def(CURRENT_STATE, '.', name);
          block(
            NEXT, ');',
            CURRENT_STATE, '.', name, '=', NEXT, ';');
          poll(
            'if(', NEXT, '!==', CURRENT, '){',
            block,
            '}');
        }
        refresh(block);
      });

      return env.compile()
    })(),
    compile: compileCommand
  }
}

function stats () {
  return {
    bufferCount: 0,
    elementsCount: 0,
    framebufferCount: 0,
    shaderCount: 0,
    textureCount: 0,
    cubeCount: 0,
    renderbufferCount: 0,
    maxTextureUnits: 0
  }
}

var GL_QUERY_RESULT_EXT = 0x8866;
var GL_QUERY_RESULT_AVAILABLE_EXT = 0x8867;
var GL_TIME_ELAPSED_EXT = 0x88BF;

var createTimer = function (gl, extensions) {
  var extTimer = extensions.ext_disjoint_timer_query;

  if (!extTimer) {
    return null
  }

  // QUERY POOL BEGIN
  var queryPool = [];
  function allocQuery () {
    return queryPool.pop() || extTimer.createQueryEXT()
  }
  function freeQuery (query) {
    queryPool.push(query);
  }
  // QUERY POOL END

  var pendingQueries = [];
  function beginQuery (stats) {
    var query = allocQuery();
    extTimer.beginQueryEXT(GL_TIME_ELAPSED_EXT, query);
    pendingQueries.push(query);
    pushScopeStats(pendingQueries.length - 1, pendingQueries.length, stats);
  }

  function endQuery () {
    extTimer.endQueryEXT(GL_TIME_ELAPSED_EXT);
  }

  //
  // Pending stats pool.
  //
  function PendingStats () {
    this.startQueryIndex = -1;
    this.endQueryIndex = -1;
    this.sum = 0;
    this.stats = null;
  }
  var pendingStatsPool = [];
  function allocPendingStats () {
    return pendingStatsPool.pop() || new PendingStats()
  }
  function freePendingStats (pendingStats) {
    pendingStatsPool.push(pendingStats);
  }
  // Pending stats pool end

  var pendingStats = [];
  function pushScopeStats (start, end, stats) {
    var ps = allocPendingStats();
    ps.startQueryIndex = start;
    ps.endQueryIndex = end;
    ps.sum = 0;
    ps.stats = stats;
    pendingStats.push(ps);
  }

  // we should call this at the beginning of the frame,
  // in order to update gpuTime
  var timeSum = [];
  var queryPtr = [];
  function update () {
    var ptr, i;

    var n = pendingQueries.length;
    if (n === 0) {
      return
    }

    // Reserve space
    queryPtr.length = Math.max(queryPtr.length, n + 1);
    timeSum.length = Math.max(timeSum.length, n + 1);
    timeSum[0] = 0;
    queryPtr[0] = 0;

    // Update all pending timer queries
    var queryTime = 0;
    ptr = 0;
    for (i = 0; i < pendingQueries.length; ++i) {
      var query = pendingQueries[i];
      if (extTimer.getQueryObjectEXT(query, GL_QUERY_RESULT_AVAILABLE_EXT)) {
        queryTime += extTimer.getQueryObjectEXT(query, GL_QUERY_RESULT_EXT);
        freeQuery(query);
      } else {
        pendingQueries[ptr++] = query;
      }
      timeSum[i + 1] = queryTime;
      queryPtr[i + 1] = ptr;
    }
    pendingQueries.length = ptr;

    // Update all pending stat queries
    ptr = 0;
    for (i = 0; i < pendingStats.length; ++i) {
      var stats = pendingStats[i];
      var start = stats.startQueryIndex;
      var end = stats.endQueryIndex;
      stats.sum += timeSum[end] - timeSum[start];
      var startPtr = queryPtr[start];
      var endPtr = queryPtr[end];
      if (endPtr === startPtr) {
        stats.stats.gpuTime += stats.sum / 1e6;
        freePendingStats(stats);
      } else {
        stats.startQueryIndex = startPtr;
        stats.endQueryIndex = endPtr;
        pendingStats[ptr++] = stats;
      }
    }
    pendingStats.length = ptr;
  }

  return {
    beginQuery: beginQuery,
    endQuery: endQuery,
    pushScopeStats: pushScopeStats,
    update: update,
    getNumPendingQueries: function () {
      return pendingQueries.length
    },
    clear: function () {
      queryPool.push.apply(queryPool, pendingQueries);
      for (var i = 0; i < queryPool.length; i++) {
        extTimer.deleteQueryEXT(queryPool[i]);
      }
      pendingQueries.length = 0;
      queryPool.length = 0;
    },
    restore: function () {
      pendingQueries.length = 0;
      queryPool.length = 0;
    }
  }
};

var GL_COLOR_BUFFER_BIT = 16384;
var GL_DEPTH_BUFFER_BIT = 256;
var GL_STENCIL_BUFFER_BIT = 1024;

var GL_ARRAY_BUFFER = 34962;

var CONTEXT_LOST_EVENT = 'webglcontextlost';
var CONTEXT_RESTORED_EVENT = 'webglcontextrestored';

var DYN_PROP = 1;
var DYN_CONTEXT = 2;
var DYN_STATE = 3;

function find (haystack, needle) {
  for (var i = 0; i < haystack.length; ++i) {
    if (haystack[i] === needle) {
      return i
    }
  }
  return -1
}

function wrapREGL (args) {
  var config = parseArgs(args);
  if (!config) {
    return null
  }

  var gl = config.gl;
  var glAttributes = gl.getContextAttributes();
  var contextLost = gl.isContextLost();

  var extensionState = createExtensionCache(gl, config);
  if (!extensionState) {
    return null
  }

  var stringStore = createStringStore();
  var stats$$1 = stats();
  var extensions = extensionState.extensions;
  var timer = createTimer(gl, extensions);

  var START_TIME = clock();
  var WIDTH = gl.drawingBufferWidth;
  var HEIGHT = gl.drawingBufferHeight;

  var contextState = {
    tick: 0,
    time: 0,
    viewportWidth: WIDTH,
    viewportHeight: HEIGHT,
    framebufferWidth: WIDTH,
    framebufferHeight: HEIGHT,
    drawingBufferWidth: WIDTH,
    drawingBufferHeight: HEIGHT,
    pixelRatio: config.pixelRatio
  };
  var uniformState = {};
  var drawState = {
    elements: null,
    primitive: 4, // GL_TRIANGLES
    count: -1,
    offset: 0,
    instances: -1
  };

  var limits = wrapLimits(gl, extensions);
  var attributeState = wrapAttributeState(
    gl,
    extensions,
    limits,
    stringStore);
  var bufferState = wrapBufferState(
    gl,
    stats$$1,
    config,
    attributeState);
  var elementState = wrapElementsState(gl, extensions, bufferState, stats$$1);
  var shaderState = wrapShaderState(gl, stringStore, stats$$1, config);
  var textureState = createTextureSet(
    gl,
    extensions,
    limits,
    function () { core.procs.poll(); },
    contextState,
    stats$$1,
    config);
  var renderbufferState = wrapRenderbuffers(gl, extensions, limits, stats$$1, config);
  var framebufferState = wrapFBOState(
    gl,
    extensions,
    limits,
    textureState,
    renderbufferState,
    stats$$1);
  var core = reglCore(
    gl,
    stringStore,
    extensions,
    limits,
    bufferState,
    elementState,
    textureState,
    framebufferState,
    uniformState,
    attributeState,
    shaderState,
    drawState,
    contextState,
    timer,
    config);
  var readPixels = wrapReadPixels(
    gl,
    framebufferState,
    core.procs.poll,
    contextState,
    glAttributes, extensions, limits);

  var nextState = core.next;
  var canvas = gl.canvas;

  var rafCallbacks = [];
  var lossCallbacks = [];
  var restoreCallbacks = [];
  var destroyCallbacks = [config.onDestroy];

  var activeRAF = null;
  function handleRAF () {
    if (rafCallbacks.length === 0) {
      if (timer) {
        timer.update();
      }
      activeRAF = null;
      return
    }

    // schedule next animation frame
    activeRAF = raf.next(handleRAF);

    // poll for changes
    poll();

    // fire a callback for all pending rafs
    for (var i = rafCallbacks.length - 1; i >= 0; --i) {
      var cb = rafCallbacks[i];
      if (cb) {
        cb(contextState, null, 0);
      }
    }

    // flush all pending webgl calls
    gl.flush();

    // poll GPU timers *after* gl.flush so we don't delay command dispatch
    if (timer) {
      timer.update();
    }
  }

  function startRAF () {
    if (!activeRAF && rafCallbacks.length > 0) {
      activeRAF = raf.next(handleRAF);
    }
  }

  function stopRAF () {
    if (activeRAF) {
      raf.cancel(handleRAF);
      activeRAF = null;
    }
  }

  function handleContextLoss (event) {
    event.preventDefault();

    // set context lost flag
    contextLost = true;

    // pause request animation frame
    stopRAF();

    // lose context
    lossCallbacks.forEach(function (cb) {
      cb();
    });
  }

  function handleContextRestored (event) {
    // clear error code
    gl.getError();

    // clear context lost flag
    contextLost = false;

    // refresh state
    extensionState.restore();
    shaderState.restore();
    bufferState.restore();
    textureState.restore();
    renderbufferState.restore();
    framebufferState.restore();
    if (timer) {
      timer.restore();
    }

    // refresh state
    core.procs.refresh();

    // restart RAF
    startRAF();

    // restore context
    restoreCallbacks.forEach(function (cb) {
      cb();
    });
  }

  if (canvas) {
    canvas.addEventListener(CONTEXT_LOST_EVENT, handleContextLoss, false);
    canvas.addEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored, false);
  }

  function destroy () {
    rafCallbacks.length = 0;
    stopRAF();

    if (canvas) {
      canvas.removeEventListener(CONTEXT_LOST_EVENT, handleContextLoss);
      canvas.removeEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored);
    }

    shaderState.clear();
    framebufferState.clear();
    renderbufferState.clear();
    textureState.clear();
    elementState.clear();
    bufferState.clear();

    if (timer) {
      timer.clear();
    }

    destroyCallbacks.forEach(function (cb) {
      cb();
    });
  }

  function compileProcedure (options) {
    check$1(!!options, 'invalid args to regl({...})');
    check$1.type(options, 'object', 'invalid args to regl({...})');

    function flattenNestedOptions (options) {
      var result = extend({}, options);
      delete result.uniforms;
      delete result.attributes;
      delete result.context;

      if ('stencil' in result && result.stencil.op) {
        result.stencil.opBack = result.stencil.opFront = result.stencil.op;
        delete result.stencil.op;
      }

      function merge (name) {
        if (name in result) {
          var child = result[name];
          delete result[name];
          Object.keys(child).forEach(function (prop) {
            result[name + '.' + prop] = child[prop];
          });
        }
      }
      merge('blend');
      merge('depth');
      merge('cull');
      merge('stencil');
      merge('polygonOffset');
      merge('scissor');
      merge('sample');

      return result
    }

    function separateDynamic (object) {
      var staticItems = {};
      var dynamicItems = {};
      Object.keys(object).forEach(function (option) {
        var value = object[option];
        if (dynamic.isDynamic(value)) {
          dynamicItems[option] = dynamic.unbox(value, option);
        } else {
          staticItems[option] = value;
        }
      });
      return {
        dynamic: dynamicItems,
        static: staticItems
      }
    }

    // Treat context variables separate from other dynamic variables
    var context = separateDynamic(options.context || {});
    var uniforms = separateDynamic(options.uniforms || {});
    var attributes = separateDynamic(options.attributes || {});
    var opts = separateDynamic(flattenNestedOptions(options));

    var stats$$1 = {
      gpuTime: 0.0,
      cpuTime: 0.0,
      count: 0
    };

    var compiled = core.compile(opts, attributes, uniforms, context, stats$$1);

    var draw = compiled.draw;
    var batch = compiled.batch;
    var scope = compiled.scope;

    // FIXME: we should modify code generation for batch commands so this
    // isn't necessary
    var EMPTY_ARRAY = [];
    function reserve (count) {
      while (EMPTY_ARRAY.length < count) {
        EMPTY_ARRAY.push(null);
      }
      return EMPTY_ARRAY
    }

    function REGLCommand (args, body) {
      var i;
      if (contextLost) {
        check$1.raise('context lost');
      }
      if (typeof args === 'function') {
        return scope.call(this, null, args, 0)
      } else if (typeof body === 'function') {
        if (typeof args === 'number') {
          for (i = 0; i < args; ++i) {
            scope.call(this, null, body, i);
          }
          return
        } else if (Array.isArray(args)) {
          for (i = 0; i < args.length; ++i) {
            scope.call(this, args[i], body, i);
          }
          return
        } else {
          return scope.call(this, args, body, 0)
        }
      } else if (typeof args === 'number') {
        if (args > 0) {
          return batch.call(this, reserve(args | 0), args | 0)
        }
      } else if (Array.isArray(args)) {
        if (args.length) {
          return batch.call(this, args, args.length)
        }
      } else {
        return draw.call(this, args)
      }
    }

    return extend(REGLCommand, {
      stats: stats$$1
    })
  }

  var setFBO = framebufferState.setFBO = compileProcedure({
    framebuffer: dynamic.define.call(null, DYN_PROP, 'framebuffer')
  });

  function clearImpl (_, options) {
    var clearFlags = 0;
    core.procs.poll();

    var c = options.color;
    if (c) {
      gl.clearColor(+c[0] || 0, +c[1] || 0, +c[2] || 0, +c[3] || 0);
      clearFlags |= GL_COLOR_BUFFER_BIT;
    }
    if ('depth' in options) {
      gl.clearDepth(+options.depth);
      clearFlags |= GL_DEPTH_BUFFER_BIT;
    }
    if ('stencil' in options) {
      gl.clearStencil(options.stencil | 0);
      clearFlags |= GL_STENCIL_BUFFER_BIT;
    }

    check$1(!!clearFlags, 'called regl.clear with no buffer specified');
    gl.clear(clearFlags);
  }

  function clear (options) {
    check$1(
      typeof options === 'object' && options,
      'regl.clear() takes an object as input');
    if ('framebuffer' in options) {
      if (options.framebuffer &&
          options.framebuffer_reglType === 'framebufferCube') {
        for (var i = 0; i < 6; ++i) {
          setFBO(extend({
            framebuffer: options.framebuffer.faces[i]
          }, options), clearImpl);
        }
      } else {
        setFBO(options, clearImpl);
      }
    } else {
      clearImpl(null, options);
    }
  }

  function frame (cb) {
    check$1.type(cb, 'function', 'regl.frame() callback must be a function');
    rafCallbacks.push(cb);

    function cancel () {
      // FIXME:  should we check something other than equals cb here?
      // what if a user calls frame twice with the same callback...
      //
      var i = find(rafCallbacks, cb);
      check$1(i >= 0, 'cannot cancel a frame twice');
      function pendingCancel () {
        var index = find(rafCallbacks, pendingCancel);
        rafCallbacks[index] = rafCallbacks[rafCallbacks.length - 1];
        rafCallbacks.length -= 1;
        if (rafCallbacks.length <= 0) {
          stopRAF();
        }
      }
      rafCallbacks[i] = pendingCancel;
    }

    startRAF();

    return {
      cancel: cancel
    }
  }

  // poll viewport
  function pollViewport () {
    var viewport = nextState.viewport;
    var scissorBox = nextState.scissor_box;
    viewport[0] = viewport[1] = scissorBox[0] = scissorBox[1] = 0;
    contextState.viewportWidth =
      contextState.framebufferWidth =
      contextState.drawingBufferWidth =
      viewport[2] =
      scissorBox[2] = gl.drawingBufferWidth;
    contextState.viewportHeight =
      contextState.framebufferHeight =
      contextState.drawingBufferHeight =
      viewport[3] =
      scissorBox[3] = gl.drawingBufferHeight;
  }

  function poll () {
    contextState.tick += 1;
    contextState.time = now();
    pollViewport();
    core.procs.poll();
  }

  function refresh () {
    pollViewport();
    core.procs.refresh();
    if (timer) {
      timer.update();
    }
  }

  function now () {
    return (clock() - START_TIME) / 1000.0
  }

  refresh();

  function addListener (event, callback) {
    check$1.type(callback, 'function', 'listener callback must be a function');

    var callbacks;
    switch (event) {
      case 'frame':
        return frame(callback)
      case 'lost':
        callbacks = lossCallbacks;
        break
      case 'restore':
        callbacks = restoreCallbacks;
        break
      case 'destroy':
        callbacks = destroyCallbacks;
        break
      default:
        check$1.raise('invalid event, must be one of frame,lost,restore,destroy');
    }

    callbacks.push(callback);
    return {
      cancel: function () {
        for (var i = 0; i < callbacks.length; ++i) {
          if (callbacks[i] === callback) {
            callbacks[i] = callbacks[callbacks.length - 1];
            callbacks.pop();
            return
          }
        }
      }
    }
  }

  var regl = extend(compileProcedure, {
    // Clear current FBO
    clear: clear,

    // Short cuts for dynamic variables
    prop: dynamic.define.bind(null, DYN_PROP),
    context: dynamic.define.bind(null, DYN_CONTEXT),
    this: dynamic.define.bind(null, DYN_STATE),

    // executes an empty draw command
    draw: compileProcedure({}),

    // Resources
    buffer: function (options) {
      return bufferState.create(options, GL_ARRAY_BUFFER, false, false)
    },
    elements: function (options) {
      return elementState.create(options, false)
    },
    texture: textureState.create2D,
    cube: textureState.createCube,
    renderbuffer: renderbufferState.create,
    framebuffer: framebufferState.create,
    framebufferCube: framebufferState.createCube,

    // Expose context attributes
    attributes: glAttributes,

    // Frame rendering
    frame: frame,
    on: addListener,

    // System limits
    limits: limits,
    hasExtension: function (name) {
      return limits.extensions.indexOf(name.toLowerCase()) >= 0
    },

    // Read pixels
    read: readPixels,

    // Destroy regl and all associated resources
    destroy: destroy,

    // Direct GL state manipulation
    _gl: gl,
    _refresh: refresh,

    poll: function () {
      poll();
      if (timer) {
        timer.update();
      }
    },

    // Current time
    now: now,

    // regl Statistics Information
    stats: stats$$1
  });

  config.onDone(null, regl);

  return regl
}

return wrapREGL;

})));


},{}],54:[function(require,module,exports){
var Emitter = require('events/')
var wheel = require('wheel')

module.exports = getScroller

function getScroller(element, preventDefault) {
  var scroll = new Emitter

  scroll.flush = flush
  flush()

  if (typeof window === 'undefined') {
    return scroll
  }

  element = element || window
  wheel(element, onscroll, false)

  return scroll

  function flush() {
    scroll[0] =
    scroll[1] =
    scroll[2] = 0
  }

  function onscroll(e) {
    // Normal/Line scrolling
    var scale = e.deltaMode === 1 ? 12 : 1

    scroll[0] += scale * (e.deltaX || 0)
    scroll[1] += scale * (e.deltaY || 0)
    scroll[2] += scale * (e.deltaZ || 0)
    scroll.emit('scroll', scroll)

    if (!preventDefault) return
    if (!e.preventDefault) return

    e.preventDefault()
    if (e.stopPropagation) e.stopPropagation()
  }
}

},{"events/":10,"wheel":57}],55:[function(require,module,exports){
module.exports = normalize

function normalize(vec) {
  var mag = 0
  for (var n = 0; n < vec.length; n++) {
    mag += vec[n] * vec[n]
  }
  mag = Math.sqrt(mag)

  // avoid dividing by zero
  if (mag === 0) {
    return Array.apply(null, new Array(vec.length)).map(Number.prototype.valueOf, 0)
  }

  for (var n = 0; n < vec.length; n++) {
    vec[n] /= mag
  }

  return vec
}

},{}],56:[function(require,module,exports){
var ua = typeof window !== 'undefined' ? window.navigator.userAgent : ''
  , isOSX = /OS X/.test(ua)
  , isOpera = /Opera/.test(ua)
  , maybeFirefox = !/like Gecko/.test(ua) && !isOpera

var i, output = module.exports = {
  0:  isOSX ? '<menu>' : '<UNK>'
, 1:  '<mouse 1>'
, 2:  '<mouse 2>'
, 3:  '<break>'
, 4:  '<mouse 3>'
, 5:  '<mouse 4>'
, 6:  '<mouse 5>'
, 8:  '<backspace>'
, 9:  '<tab>'
, 12: '<clear>'
, 13: '<enter>'
, 16: '<shift>'
, 17: '<control>'
, 18: '<alt>'
, 19: '<pause>'
, 20: '<caps-lock>'
, 21: '<ime-hangul>'
, 23: '<ime-junja>'
, 24: '<ime-final>'
, 25: '<ime-kanji>'
, 27: '<escape>'
, 28: '<ime-convert>'
, 29: '<ime-nonconvert>'
, 30: '<ime-accept>'
, 31: '<ime-mode-change>'
, 27: '<escape>'
, 32: '<space>'
, 33: '<page-up>'
, 34: '<page-down>'
, 35: '<end>'
, 36: '<home>'
, 37: '<left>'
, 38: '<up>'
, 39: '<right>'
, 40: '<down>'
, 41: '<select>'
, 42: '<print>'
, 43: '<execute>'
, 44: '<snapshot>'
, 45: '<insert>'
, 46: '<delete>'
, 47: '<help>'
, 91: '<meta>'  // meta-left -- no one handles left and right properly, so we coerce into one.
, 92: '<meta>'  // meta-right
, 93: isOSX ? '<meta>' : '<menu>'      // chrome,opera,safari all report this for meta-right (osx mbp).
, 95: '<sleep>'
, 106: '<num-*>'
, 107: '<num-+>'
, 108: '<num-enter>'
, 109: '<num-->'
, 110: '<num-.>'
, 111: '<num-/>'
, 144: '<num-lock>'
, 145: '<scroll-lock>'
, 160: '<shift-left>'
, 161: '<shift-right>'
, 162: '<control-left>'
, 163: '<control-right>'
, 164: '<alt-left>'
, 165: '<alt-right>'
, 166: '<browser-back>'
, 167: '<browser-forward>'
, 168: '<browser-refresh>'
, 169: '<browser-stop>'
, 170: '<browser-search>'
, 171: '<browser-favorites>'
, 172: '<browser-home>'

  // ff/osx reports '<volume-mute>' for '-'
, 173: isOSX && maybeFirefox ? '-' : '<volume-mute>'
, 174: '<volume-down>'
, 175: '<volume-up>'
, 176: '<next-track>'
, 177: '<prev-track>'
, 178: '<stop>'
, 179: '<play-pause>'
, 180: '<launch-mail>'
, 181: '<launch-media-select>'
, 182: '<launch-app 1>'
, 183: '<launch-app 2>'
, 186: ';'
, 187: '='
, 188: ','
, 189: '-'
, 190: '.'
, 191: '/'
, 192: '`'
, 219: '['
, 220: '\\'
, 221: ']'
, 222: "'"
, 223: '<meta>'
, 224: '<meta>'       // firefox reports meta here.
, 226: '<alt-gr>'
, 229: '<ime-process>'
, 231: isOpera ? '`' : '<unicode>'
, 246: '<attention>'
, 247: '<crsel>'
, 248: '<exsel>'
, 249: '<erase-eof>'
, 250: '<play>'
, 251: '<zoom>'
, 252: '<no-name>'
, 253: '<pa-1>'
, 254: '<clear>'
}

for(i = 58; i < 65; ++i) {
  output[i] = String.fromCharCode(i)
}

// 0-9
for(i = 48; i < 58; ++i) {
  output[i] = (i - 48)+''
}

// A-Z
for(i = 65; i < 91; ++i) {
  output[i] = String.fromCharCode(i)
}

// num0-9
for(i = 96; i < 106; ++i) {
  output[i] = '<num-'+(i - 96)+'>'
}

// F1-F24
for(i = 112; i < 136; ++i) {
  output[i] = 'F'+(i-111)
}

},{}],57:[function(require,module,exports){
/**
 * This module unifies handling of mouse whee event accross different browsers
 *
 * See https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel?redirectlocale=en-US&redirectslug=DOM%2FMozilla_event_reference%2Fwheel
 * for more details
 *
 * Usage:
 *  var addWheelListener = require('wheel');
 *  addWheelListener(domElement, function (e) {
 *    // mouse wheel event
 *  });
 */
module.exports = addWheelListener;

var prefix = "", _addEventListener, onwheel, support;

// detect event model
if ( window.addEventListener ) {
    _addEventListener = "addEventListener";
} else {
    _addEventListener = "attachEvent";
    prefix = "on";
}

// detect available wheel event
support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
          document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
          "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

function addWheelListener( elem, callback, useCapture ) {
    _addWheelListener( elem, support, callback, useCapture );

    // handle MozMousePixelScroll in older Firefox
    if( support == "DOMMouseScroll" ) {
        _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
    }
};

function _addWheelListener( elem, eventName, callback, useCapture ) {
  elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
    !originalEvent && ( originalEvent = window.event );

    // create a normalized event object
    var event = {
      // keep a ref to the original event object
      originalEvent: originalEvent,
      target: originalEvent.target || originalEvent.srcElement,
      type: "wheel",
      deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
      deltaX: 0,
      delatZ: 0,
      preventDefault: function() {
        originalEvent.preventDefault ?
            originalEvent.preventDefault() :
            originalEvent.returnValue = false;
      }
    };

    // calculate deltaY (and deltaX) according to the event
    if ( support == "mousewheel" ) {
      event.deltaY = - 1/40 * originalEvent.wheelDelta;
      // Webkit also support wheelDeltaX
      originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
    } else {
      event.deltaY = originalEvent.detail;
    }

    // it's time to fire the callback
    return callback( event );

  }, useCapture || false );
}

},{}]},{},[5])