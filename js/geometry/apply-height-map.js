const cloneDeep = require('clone-deep');
const vec3 = require('gl-matrix').vec3;
const mat4 = require('gl-matrix').mat4;
const lerp = require('lerp');
const simplify = require('../workers/simplify');
const objUVLookup = require('../send-buffer').objUVLookup;
const computeNormals = require('angle-normals');
const wythoffModels = require('../geometry/wythoff-models');

// todo abc is no longer useful to create uvs as geom has been warped
function apply(model, invModel, abc, abcUv, geom, heightMapObj) {
  geom = cloneDeep(geom);
  geom.positions.forEach((v, i) => {
    var uv = geom.uvs[i];
    uv = [1 - uv[0], 1 - uv[1]];
    var pixel = objUVLookup(heightMapObj, uv);
    var height = pixel[0] / 255;
    height = lerp(.1, 1, height);
    vec3.transformMat4(v, v, model);
    vec3.normalize(v, v);
    vec3.scale(v, v, height);
    vec3.transformMat4(v, v, invModel);
  });

  var details = [100];
  var LODs = details.map(detail => {
    return geom;
    // return simplify(abc, abcUv, geom, detail).then(geom => {
    //   geom.normals = computeNormals(geom.cells, geom.positions);
    //   return geom;
    // });
  });

  return Promise.all(LODs);
}


module.exports = function(poly, abc, abcUv, geom) {
  var models = wythoffModels(poly, abc).models;
  var model = models[0];
  var invModel = mat4.invert([], model);
  return apply.bind(this, model, invModel, abc, abcUv, geom);
};
