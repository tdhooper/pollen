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
const combine = require('../lib/mesh-combine');
const merge = require('../lib/merge-vertices');
const wythoffModels = require('../geometry/wythoff-models');
const convert = require('./convert-three');


function applyMatrix(geom, matrix) {
  geom.positions.forEach(v => {
    vec3.transformMat4(v, v, matrix);
  });
}

function combineIntoPoly(geom, wythoff) {

  var geoms = wythoff.map(w => {
    var geom2 = cloneDeep(geom);
    applyMatrix(geom2, w.matrix);
    return geom2;
  });

  var combined = combine(geoms);
  combined = merge(combined.cells, combined.positions, combined.uvs, combined.normals);

  return combined;
}

function getSlicePlanes(abc) {

  var [a, b, c] = abc;

  var tA = new Vector3().fromArray(a);
  var tB = new Vector3().fromArray(b);
  var tC = new Vector3().fromArray(c);
  var tO = new Vector3();

  var planeB = new Plane().setFromCoplanarPoints(tO, tC, tB);
  var planeC = new Plane().setFromCoplanarPoints(tO, tA, tC);

  return [planeB, planeC];
}

function getBoundingPlanes(abc) {

  var [a, b, c] = abc;
  var border = .1;

  var pairs = [
    [a, b],
    [b, c],
    [c, a]
  ];

  var tO = new Vector3();

  var planes = pairs.map(pair => {
    var tA = new Vector3().fromArray(pair[0]);
    var tB = new Vector3().fromArray(pair[1]);
    var plane = new Plane().setFromCoplanarPoints(tO, tB, tA);
    plane.constant += border;
    return plane;
  });

  return planes;
}

function getMirrorPlane(abc) {

  var [a, b, c] = abc;

  var tA = new Vector3().fromArray(a);
  var tB = new Vector3().fromArray(b);
  var tO = new Vector3();

  var plane = new Plane().setFromCoplanarPoints(tO, tB, tA);

  return plane;
}

function reflect(vout, vin, planeNormal, planeConstant) {
  var s = 2 * (vec3.dot(planeNormal, vin) - planeConstant);
  var vv = vec3.scale([], planeNormal, s);
  vec3.sub(vout, vin, vv);
}

function mirror(geom, plane) {

  var tGeom = convert.geomToThree(geom);

  var slicePlane = plane.clone();
  slicePlane.constant += .001;
  tGeom = sliceGeometry(tGeom, slicePlane);

  var geomA = convert.threeToGeom(tGeom);
  var geomB = cloneDeep(geomA);

  var planeNormal = plane.normal.toArray();

  geomB.positions.forEach(v => {
    reflect(v, v, planeNormal, plane.constant);
  });

  geomB.normals.forEach(v => {
    reflect(v, v, planeNormal, plane.constant);
  });

  geomB.cells = geomB.cells.map(cell => {
    return [cell[2], cell[1], cell[0]];
  });

  var combined = combine([geomA, geomB]);
  // combined = merge(combined.cells, combined.positions, combined.uvs);

  return combined;
}

function applyHeightMap(geom, heightMapObj, model, invModel) {
  geom.positions.forEach((v, i) => {
    var uv = geom.uvs[i];
    var pixel = objUVLookup(heightMapObj, uv);
    var height = pixel[0] / 255;
    height = lerp(.5, 1, height);
    vec3.transformMat4(v, v, model);
    vec3.normalize(v, v);
    vec3.scale(v, v, height);
    vec3.transformMat4(v, v, invModel);
  });
}

function sliceWithPlanes(geom, planes) {
  var tGeom = convert.geomToThree(geom);
  planes.forEach(plane => {
    tGeom = sliceGeometry(tGeom, plane);
  });
  return convert.threeToGeom(tGeom);
}


// todo abc is no longer useful to create uvs as geom has been warped
function apply(wythoff, abc, abcUv, geom, heightMapObj) {
  var model = wythoff[0].matrix;
  var invModel = mat4.invert([], model);

  var wythoffABC = [
    wythoff[0].a,
    wythoff[0].b,
    wythoff[0].c
  ];

  var mirroredWythoffABC = [
    wythoff[0].a,
    vec3.lerp([], wythoff[0].b, wythoff[0].c, .5),
    wythoff[0].c
  ];

  var planes = getSlicePlanes(wythoffABC);
  var boundingPlanes = getBoundingPlanes(mirroredWythoffABC);
  var mirrorPlane = new Plane(new Vector3(1,0,0), 0);

  geom = cloneDeep(geom);
  applyHeightMap(geom, heightMapObj, model, invModel);

  geom = combineIntoPoly(geom, wythoff);

  applyMatrix(geom, invModel);
  geom.normals = computeNormals(geom.cells, geom.positions);
  applyMatrix(geom, model);

  geom = sliceWithPlanes(geom, boundingPlanes);

  var details = [.8, .7, .6, .4];

  var LODs = details.map(detail => {

    return simplify(abc, abcUv, geom, detail).then(geom => {

      geom = sliceWithPlanes(geom, planes);

      applyMatrix(geom, invModel);

      geom = mirror(geom, mirrorPlane);

      return geom;
    });
  });

  return Promise.all(LODs);
}

module.exports = function(poly, abc, abcUv, geom) {
  var wythoff = wythoffModels(poly, abc);
  return apply.bind(this, wythoff, abc, abcUv, geom);
};

/*

create a normal map the same way we create a height map
will need to simulate a position for each uv

tidy up first!

*/