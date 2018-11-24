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

  var planeB = new Plane().setFromCoplanarPoints(tO, tB, tC);
  var planeC = new Plane().setFromCoplanarPoints(tO, tA, tB);

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
    var height = pixel[0];
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


function recalculateUvs(geom, aligned) {
  applyMatrix(geom, aligned.matrix);

  var x = aligned.b[0];
  var y = aligned.a[1];
  var z = aligned.b[2];

  geom.uvs = geom.uvs.map((uv, i) => {
    var p = geom.positions[i];
    var intersect = vec3.scale([], p, y / p[1]);
    return [
      intersect[0] / x,
      1 - intersect[2] / z
    ];
  });

  var invAligned = mat4.invert([], aligned.matrix);
  applyMatrix(geom, invAligned);
}


function apply(wythoff, geom, heightMapObj) {
  var w = wythoff.models[0];

  var model = w.matrix;
  var invModel = mat4.invert([], model);

  var wythoffABC = [w.a, w.b, w.c];

  var mirroredWythoffABC = [
    w.a,
    vec3.lerp([], w.b, w.c, .5),
    w.b
  ];

  var planes = getSlicePlanes(wythoffABC);
  var boundingPlanes = getBoundingPlanes(mirroredWythoffABC);
  var mirrorPlane = new Plane(new Vector3(1,0,0), 0);

  geom = cloneDeep(geom);

  applyHeightMap(geom, heightMapObj, model, invModel);

  geom = combineIntoPoly(geom, wythoff.models);
  geom = sliceWithPlanes(geom, boundingPlanes);

  applyMatrix(geom, invModel);

  geom.normals = computeNormals(geom.cells, geom.positions);
  recalculateUvs(geom, wythoff.aligned);

  applyMatrix(geom, model);

  var details = [.775, .7, .6, .4];
  // var details = [.6];
  var LODs = details.map(detail => {

    // applyMatrix(geom, invModel);
    // return geom;

    return simplify(geom, detail).then(geom => {

      geom = sliceWithPlanes(geom, planes);

      applyMatrix(geom, invModel);

      geom = mirror(geom, mirrorPlane);

      return geom;
    });
  });

  return Promise.all(LODs);
}

module.exports = function(wythoff, geom) {
  return apply.bind(this, wythoff, geom);
};

/*

create a normal map the same way we create a height map
will need to simulate a position for each uv

tidy up first!

*/