const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;


var wythoffModels = function(poly, sourceABC) {

  var cells = poly.face.slice();
  var positions = poly.vertex.slice();

  var models = [];

  // Wythoff triangle ABC verties for each model
  var iA = [];
  var iB = [];
  var iC = [];

  var only = false;

  cells.forEach((cell, i) => {

    if (true && i !== 0) {
      // return;
    }

    var a = positions[cell[0]];
    var b = positions[cell[1]];
    var c = positions[cell[2]];

    var m = vec3.add([], a, b);
    vec3.add(m, m, c);
    vec3.scale(m, m, 1/3);
    
    var ab = vec3.lerp([], a, b, .5);
    var bc = vec3.lerp([], b, c, .5);
    var ca = vec3.lerp([], c, a, .5);

    models.push(wythoffTriangle(sourceABC, [m, a, b]));
    // models.push(wythoffTriangle(sourceABC, [ab, b, m], true));

    iA.push(m); iB.push(a); iC.push(b);
    // iA.push(ab); iB.push(m); iC.push(b);
    // return;
    models.push(wythoffTriangle(sourceABC, [m, b, c]));
    // models.push(wythoffTriangle(sourceABC, [bc, c, m], true));

    iA.push(m); iB.push(b); iC.push(c);
    // iA.push(bc); iB.push(m); iC.push(c);

    models.push(wythoffTriangle(sourceABC, [m, c, a]));
    // models.push(wythoffTriangle(sourceABC, [ca, a, m], true));

    iA.push(m); iB.push(c); iC.push(a);
    // iA.push(ca); iB.push(m); iC.push(a);

  });

  return {
    models: models,
    iA: iA,
    iB: iB,
    iC: iC
  };
};

// Construct matrix to transform triangle patch into
// the given abc triangle
var _wythoffTriangle = function(va, vb, vc) {
  var vba = vec3.sub([], vb, va);
  var vca = vec3.sub([], vc, va);

  // Construct rotation matrix from normal, tangent, bitangent
  var n = vec3.normalize([], vba);
  var t = vec3.cross([], vba, vca);
  vec3.normalize(t, t);
  var b = vec3.cross([], t, n);
  var mR = [
    n[0], t[0], b[0], 0,
    n[1], t[1], b[1], 0,
    n[2], t[2], b[2], 0,
    0, 0, 0, 1
  ];
  mat4.invert(mR, mR);

  // Translate to first corner
  var translation = va;
  var mT = mat4.fromTranslation([], translation);
  var model = mat4.multiply([], mT, mR);

  // Scale by each edge
  var scale = [vec3.length(vba), 1, vec3.length(vca)];
  mat4.scale(model, model, scale);

  return model;
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
