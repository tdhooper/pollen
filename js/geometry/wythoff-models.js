const mat4 = require('gl-matrix').mat4;
const mat3 = require('gl-matrix').mat3;
const quat = require('gl-matrix').quat;
const vec3 = require('gl-matrix').vec3;


var wythoffModels = function(poly, sourceABC) {

  var cells = poly.face.slice();
  var positions = poly.vertex.slice();

  var models = [];

  // construct model which has same sized triangle,
  // but aligned with axis, y is up

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

    models.push({
      matrix: wythoffTriangle(sourceABC, [m, a, b]),
      a: m,
      b: b,
      c: a
    });

    models.push({
      matrix: wythoffTriangle(sourceABC, [m, b, c]),
      a: m,
      b: c,
      c: b
    });

    models.push({
      matrix: wythoffTriangle(sourceABC, [m, c, a]),
      a: m,
      b: a,
      c: c
    });
  });

  var m = models[0].a;
  var a = models[0].c;
  var b = models[0].b;

  var ab = vec3.lerp([], a, b, .5);

  var y = vec3.length(m);
  var x = vec3.dist(a, b) / 2;
  var z = vec3.dist(m, ab);

  var m2 = [0,-y,0];
  var a2 = [x,-y,z];
  var b2 = [-x,-y,z];

  var aligned = {
    matrix: wythoffTriangle(sourceABC, [m2, a2, b2]),
    a: m2,
    b: a2,
    c: b2
  };

  // mat4.fromTranslation(aligned.matrix, [0,1,0]);

  return {
    models: models,
    aligned: aligned
  };
};

// https://stackoverflow.com/a/4679651
var wythoffTriangle = function(sourceABC, abc) {

  var [v1, v2, v3] = sourceABC;
  var [v1p, v2p, v3p] = abc;

  var v4 = vec3.cross([], vec3.sub([], v2, v1), vec3.sub([], v3, v1));
  vec3.add(v4, v4, v1);

  var v4p = vec3.cross([], vec3.sub([], v2p, v1p), vec3.sub([], v3p, v1p));
  vec3.add(v4p, v4p, v1p);

  var t1 = [
    v1[0], v1[1], v1[2], 1,
    v2[0], v2[1], v2[2], 1,
    v3[0], v3[1], v3[2], 1,
    v4[0], v4[1], v4[2], 1
  ];

  var t2 = [
    v1p[0], v1p[1], v1p[2], 1,
    v2p[0], v2p[1], v2p[2], 1,
    v3p[0], v3p[1], v3p[2], 1,
    v4p[0], v4p[1], v4p[2], 1
  ];

  var model = mat4.multiply([], t2, mat4.invert([], t1));

  return model;
};

module.exports = wythoffModels;
