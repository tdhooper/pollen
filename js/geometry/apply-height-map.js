const cloneDeep = require('clone-deep');
const vec3 = require('gl-matrix').vec3;
const lerp = require('lerp');
const simplify = require('../workers/simplify');
const objUVLookup = require('../send-buffer').objUVLookup;
const computeNormals = require('angle-normals');


function polyFaceDistance(poly) {
  var cell = poly.face[0];
  var mid = vec3.create();
  vec3.add(mid, mid, poly.vertex[cell[0]]);
  vec3.add(mid, mid, poly.vertex[cell[1]]);
  vec3.add(mid, mid, poly.vertex[cell[2]]);
  vec3.scale(mid, mid, 1/3);
  return vec3.length(mid);
}

module.exports = function(poly, abc, abcUv, geom, heightMapObj) {
  geom = cloneDeep(geom);
  var dist = polyFaceDistance(poly);
  var up = [0, dist, 0];
  geom.positions.forEach((v, i) => {
    var uv = geom.uvs[i];
    var pixel = objUVLookup(heightMapObj, uv);
    var height = pixel[0] / 255;
    height = lerp(.1, 1, height);
    vec3.sub(v, v, up);
    vec3.normalize(v, v);
    vec3.add(v, v, up);
    // vec3.scale(v, v, height);
  });
  /*
    - work out how far center of polyhedron is from center of face
    - translate up (well, y) by this amount
    - normalize
    - scale by height map for uv

    - simplify

    - compute normals

    when rendering... remove height and normals step    
  */

  var details = [100];
  var LODs = details.map(detail => {
    return geom;
    // return simplify(abc, abcUv, geom, detail).then(geom => {
    //   geom.normals = computeNormals(geom.cells, geom.positions);
    //   return geom;
    // });
  });

  return Promise.all(LODs);
};
