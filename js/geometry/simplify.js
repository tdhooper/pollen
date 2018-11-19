import { Vector3 } from 'three/src/math/Vector3';
import { Face3 } from 'three/src/core/Face3';
import { Geometry } from 'three/src/core/Geometry';
import { SimplifyModifier } from '../lib/SimplifyModifier';

const cartToBary = require('barycentric');
const vec2 = require('gl-matrix').vec2;
const xz = require('./xz');


var modifier = new SimplifyModifier();


function baryToCart(abc, bc) {
  var cart = vec2.create();
  vec2.scaleAndAdd(cart, cart, abc[0], bc[0]);
  vec2.scaleAndAdd(cart, cart, abc[1], bc[1]);
  vec2.scaleAndAdd(cart, cart, abc[2], bc[2]);
  return Array.prototype.slice.call(cart);
}


var threeToGeom = function(abc, abcUv, tGeom) {
  if (tGeom.isBufferGeometry) {
    tGeom = new Geometry().fromBufferGeometry(tGeom);
  }
  var positions = tGeom.vertices.map(function(vert) {
      return [vert.x, vert.y, vert.z];
  });
  var cells = tGeom.faces.map(function(face) {
      return [face.a, face.b, face.c];
  });
  var uvs = positions.map(p => {
    var bc = cartToBary(abc, xz(p));
    var uv = baryToCart(abcUv, bc);
    return uv;
  });
  return {
    positions: positions,
    cells: cells,
    uvs: uvs
  };
};


var geomToThree = function(geom) {
  var tGeom = new Geometry();
  tGeom.vertices = geom.positions.map(function(position) {
      return new Vector3().fromArray(position);
  });
  tGeom.faces = geom.cells.map(function(cell) {
      return new Face3(cell[0], cell[1], cell[2]);
  });
  return tGeom;
};


function simplifyWithUvs(abc, abcUv, geom, detail) {
  var remove = geom.positions.length - detail;
  var tGeom = geomToThree(geom);
  var tSimplified = modifier.modify(tGeom, remove);
  var simplified = threeToGeom(abc, abcUv, tSimplified);
  return simplified;
}


module.exports = simplifyWithUvs;
