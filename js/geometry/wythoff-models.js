const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;


var wythoffModels = function(poly) {

  var cells = poly.face.slice();
  var positions = poly.vertex.slice();

  var models = [];

  // Wythoff triangle ABC verties for each model
  var iA = [];
  var iB = [];
  var iC = [];

  var only = false;

  cells.forEach((cell, i) => {

    if (only && i !== 0) {
      return;
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

    models.push(wythoffTriangle(ab, a, m));
    models.push(wythoffTriangle(ab, m, b));

    iA.push(ab); iB.push(a); iC.push(m);
    iA.push(ab); iB.push(m); iC.push(b);

    models.push(wythoffTriangle(bc, b, m));
    models.push(wythoffTriangle(bc, m, c));

    iA.push(bc); iB.push(b); iC.push(m);
    iA.push(bc); iB.push(m); iC.push(c);

    models.push(wythoffTriangle(ca, c, m));
    models.push(wythoffTriangle(ca, m, a));

    iA.push(ca); iB.push(c); iC.push(m);
    iA.push(ca); iB.push(m); iC.push(a);

  });

  return {
    models: models,
    iA: iA,
    iB: iB,
    iC: iC
  };
};


var wythoffTriangle = function(va, vb, vc) {
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


module.exports = wythoffModels;
