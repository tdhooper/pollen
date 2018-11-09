const geometry = require('./geometry/polyhedra');
const mat4 = require('gl-matrix').mat4;
const vec4 = require('gl-matrix').vec4;
const vec3 = require('gl-matrix').vec3;
const mat3 = require('gl-matrix').mat3;
const quat = require('gl-matrix').quat;
const polyhedra = require('polyhedra');
const normals = require('angle-normals');
// var createCube = require('primitive-cube');

var Pollenet = function(abcUv, detail) {

  var geom = {
      cells: [
        [0, 1, 2]
      ],
      positions: [
        [0, 0, 0],
        [0, 0, 1],
        [1, 0, 0]
      ],
      uvs: abcUv,
      normals: [
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1]
      ]
  };

  var poly = polyhedra.platonic.Tetrahedron;
  var cells = poly.face.slice();
  var positions = poly.vertex.slice();

  var models = [];

  var T = [];
  var R = [];
  var S = [];

  cells.forEach((cell, i) => {

    var a = positions[cell[0]];
    var b = positions[cell[1]];
    var c = positions[cell[2]];

    var m = vec3.add([], a, b);
    vec3.add(m, m, c);
    vec3.scale(m, m, 1/3);
    
    var ab = vec3.lerp([], a, b, .5);
    var bc = vec3.lerp([], b, c, .5);
    var ca = vec3.lerp([], c, a, .5);

    models.push(this.wythoffTriangle(ab, a, m));
    models.push(this.wythoffTriangle(ab, m, b));

    models.push(this.wythoffTriangle(bc, b, m));
    models.push(this.wythoffTriangle(bc, m, c));

    models.push(this.wythoffTriangle(ca, c, m));
    models.push(this.wythoffTriangle(ca, m, a));


    this.wythoffTriangleI(ab, a, m, T, R, S);
    this.wythoffTriangleI(ab, m, b, T, R, S);

    this.wythoffTriangleI(bc, b, m, T, R, S);
    this.wythoffTriangleI(bc, m, c, T, R, S);

    this.wythoffTriangleI(ca, c, m, T, R, S);
    this.wythoffTriangleI(ca, m, a, T, R, S);
  });

  this.models = models;

  var iModelRow0 = [];
  var iModelRow1 = [];
  var iModelRow2 = [];
  var iModelRow3 = [];

  models.forEach(model => {
    iModelRow0.push(model.slice(0, 4));
    iModelRow1.push(model.slice(4, 8));
    iModelRow2.push(model.slice(8, 12));
    iModelRow3.push(model.slice(12, 16));
  });

  var N = models.length;
  var instances = Array(N).fill().map((_, i) => {
    return i;
  });

  this.drawGeom = regl({
    frag: `
      precision mediump float;
      varying vec3 vnormal;
      void main () {
          gl_FragColor = vec4(vnormal * .5 + .5, 1.0);
      }`,
    vert: `
      precision mediump float;
      uniform mat4 proj;
      uniform mat4 model;
      uniform mat4 view;
      attribute vec3 position;
      attribute vec3 normal;
      varying vec3 vnormal;

      void main () {
        vnormal = normal;
        gl_Position = proj * view * model * vec4(position, 1.0);
      }`,
    attributes: {
      position: geom.positions,
      normal: geom.normals,
    },
    elements: geom.cells,
    context: {
      model:function(context, props) {
        return props.model;
      },
      view: function(context, props) {
        return props.camera.view();
      },
      proj: function(context, props) {
        return props.camera.projection(
          context.viewportWidth,
          context.viewportHeight
        );
      },
    },
    uniforms: {
      model: regl.context('model'),
      view: regl.context('view'),
      proj: regl.context('proj')
    },
    framebuffer: regl.prop('destination')
  });

  this.drawSphere = regl({
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
      attribute vec4 iModelRow0;
      attribute vec4 iModelRow1;
      attribute vec4 iModelRow2;
      attribute vec4 iModelRow3;
      varying vec3 vnormal;
      varying vec2 vuv;
      varying float height;

      void main () {
        vnormal = normal;
        vuv = uv;
        height = texture2D(heightMap, vec2(1) - vuv).r;
        vec3 pos = position;

        mat4 iModel = mat4(
          iModelRow0,
          iModelRow1,
          iModelRow2,
          iModelRow3
        );

        vec4 pos4 = vec4(pos, 1);
        pos4 = iModel * pos4;

        // pos = normalize(pos4.xyz);
        // // pos *= .8;
        // // pos *= mix(.5, 1., height);
        // pos4 = vec4(pos, 1);

        gl_Position = proj * view * model * pos4;
      }`,
    context: {
      model:function(context, props) {
        return props.pollenet.model;
      },
      view: function(context, props) {
        return props.camera.view();
      },
      proj: function(context, props) {
        return props.camera.projection(
          context.viewportWidth,
          context.viewportHeight
        );
      },
      mesh: (context, props) => {
        return geom;

        var model = props.pollenet.model;
        var view = props.camera.view();

        var camPos = mat4.getTranslation([], mat4.invert([], view));
        var modelPos = mat4.getTranslation([], model);
        var dist = vec3.dist(camPos, modelPos);

        var vFOV = Math.PI / 10;
        var vHeight = 2 * Math.tan( vFOV / 2 ) * dist;
        var aspect = context.viewportWidth / context.viewportHeight;

        var fraction = 2 / vHeight;

        var lod = Math.round(fraction * (LODs.length - 1));
        lod = Math.min(lod, LODs.length - 1);

        return LODs[lod];
      }
    },
    attributes: {
      position: regl.context('mesh.positions'),
      normal: regl.context('mesh.normals'),
      uv: regl.context('mesh.uvs'),
      instance: {
        buffer: instances,
        divisor: 1
      },
      iModelRow0: {
        buffer: iModelRow0,
        divisor: 1
      },
      iModelRow1: {
        buffer: iModelRow1,
        divisor: 1
      },
      iModelRow2: {
        buffer: iModelRow2,
        divisor: 1
      },
      iModelRow3: {
        buffer: iModelRow3,
        divisor: 1
      },
    },
    elements: regl.context('mesh.cells'),
    instances: N,
    uniforms: {
      model: regl.context('model'),
      view: regl.context('view'),
      proj: regl.context('proj'),
      video: function(context, props) {
        return props.pollenet.image;
      },
      heightMap: function(context, props) {
        return props.pollenet.height;
      },
    },
    framebuffer: regl.prop('destination')
  });
};

Pollenet.prototype.wythoffTriangle = function(va, vb, vc) {
    var vba = vec3.sub([], vb, va);
    var vca = vec3.sub([], vc, va);

    var n = vec3.normalize([], vba);
    var t = vec3.cross([], vba, vca);
    vec3.normalize(t, t);
    var b = vec3.cross([], t, n);

    var translation = va;
    var mT = mat4.fromTranslation([], translation);
    var mR = [
      n[0], t[0], b[0], 0,
      n[1], t[1], b[1], 0,
      n[2], t[2], b[2], 0,
      0, 0, 0, 1
    ];
    mat4.invert(mR, mR);
    var model = mat4.multiply([], mT, mR);

    var scale = [vec3.length(vba), 1, vec3.length(vca)];
    mat4.scale(model, model, scale);

    return model;
};


Pollenet.prototype.wythoffTriangleI = function(va, vb, vc, T, R, S) {
    var vba = vec3.sub([], vb, va);
    var vca = vec3.sub([], vc, va);

    var n = vec3.normalize([], vba);
    var t = vec3.cross([], vba, vca);
    vec3.normalize(t, t);
    var b = vec3.cross([], t, n);

    var translation = va;
    var rotation = [
      n[0], t[0], b[0],
      n[1], t[1], b[1],
      n[2], t[2], b[2],
    ];
    mat3.invert(rotation, rotation);

    rotation = mat3.identity([]);

    var scale = [vec3.length(vba), 1, vec3.length(vca)];

    T.push(translation);
    R.push(rotation);
    S.push(scale);
};


Pollenet.prototype.draw = function(conf) {
  this.drawSphere(conf);


  // this.polyGeom = {
  //   cells: poly.face,
  //   positions: poly.vertex,
  //   normals: normals(poly.face, poly.vertex)
  // };

  // this.models = models;

  // // this.drawGeom(Object.assign({geom: this.polyGeom}, conf, {model: mat4.identity([])}));

  // this.models.forEach(model => {
  //   this.drawGeom(Object.assign({}, conf, {model: model}));
  // });

};

module.exports = Pollenet;
