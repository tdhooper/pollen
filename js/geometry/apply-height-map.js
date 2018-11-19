import { Plane } from 'three/src/math/Plane';
import { Vector3 } from 'three/src/math/Vector3';

const cloneDeep = require('clone-deep');
const THREE = require('three');
const vec3 = require('gl-matrix').vec3;
const mat4 = require('gl-matrix').mat4;
const lerp = require('lerp');
const sliceGeometry = require('threejs-slice-geometry')(THREE);
const simplify = require('../workers/simplify');
const objUVLookup = require('../send-buffer').objUVLookup;
const computeNormals = require('angle-normals');
const combine = require('mesh-combine');
const merge = require('merge-vertices');
const wythoffModels = require('../geometry/wythoff-models');
const convert = require('./convert-three');


function applyMatrix(geom, matrix) {
  geom.positions.forEach(v => {
    vec3.transformMat4(v, v, matrix);
  });
}

// todo abc is no longer useful to create uvs as geom has been warped
function apply(wythoff, abc, abcUv, geom, heightMapObj) {

  var geoms = wythoff.models.map(matrix => {
    var geom2 = cloneDeep(geom);
    applyMatrix(geom2, matrix);
    return geom2;
  });

  var combined = combine(geoms);
  combined = merge(combined.cells, combined.positions);

  var model = wythoff.models[0];
  var invModel = mat4.invert([], model);
  var a = wythoff.iA[0];
  var b = wythoff.iB[0];
  var c = wythoff.iC[0];

  var tA = new Vector3().fromArray(a);
  var tB = new Vector3().fromArray(b);
  var tC = new Vector3().fromArray(c);
  var tO = new Vector3();

  var planeA = new Plane().setFromCoplanarPoints(tO, tA, tB);
  var planeB = new Plane().setFromCoplanarPoints(tO, tB, tC);
  var planeC = new Plane().setFromCoplanarPoints(tO, tC, tA);

  // applyMatrix(sliced, invModel);


  combined.positions.forEach((v, i) => {
    // var uv = geom.uvs[i];
    // var pixel = objUVLookup(heightMapObj, uv);
    // var height = pixel[0] / 255;
    // height = lerp(.5, 1, height);
    // vec3.transformMat4(v, v, model);
    vec3.normalize(v, v);
    // vec3.scale(v, v, height);
    // vec3.transformMat4(v, v, invModel);
  });

  geom = combined;

  var details = [100];
  var LODs = details.map(detail => {
    // geom.normals = computeNormals(geom.cells, geom.positions);
    // geom.uvs = geom.positions.map(_ => {
    //   return [0,0];
    // });
    // return geom;

    return simplify(abc, abcUv, geom, detail).then(geom => {

      var tGeom = convert.geomToThree(geom);
      tGeom = sliceGeometry(tGeom, planeA);
      tGeom = sliceGeometry(tGeom, planeB);
      tGeom = sliceGeometry(tGeom, planeC);

      geom = convert.threeToGeom(tGeom);
      applyMatrix(geom, invModel);

      geom.uvs = geom.positions.map(_ => {
        return [0,0];
      });
      geom.normals = geom.positions.map(p => {
        return [Math.random(), Math.random(), Math.random()];
      });

      return geom;
    });
  });

  return Promise.all(LODs);
}

/*

  * create a single waterproof mesh from wythoff
  * simplify
  * create slice planes from a single whytoff section
  * slice
  * translate back to origin with the same wythoff section model inverse

*/

module.exports = function(poly, abc, abcUv, geom) {
  var wythoff = wythoffModels(poly, abc);
  return apply.bind(this, wythoff, abc, abcUv, geom);
};
