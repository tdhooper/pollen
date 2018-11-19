import { SimplifyModifier } from '../lib/SimplifyModifier';

const cartToBary = require('barycentric');
const vec2 = require('gl-matrix').vec2;
const xz = require('./xz');
const convert = require('./convert-three');


var modifier = new SimplifyModifier();


function baryToCart(abc, bc) {
  var cart = vec2.create();
  vec2.scaleAndAdd(cart, cart, abc[0], bc[0]);
  vec2.scaleAndAdd(cart, cart, abc[1], bc[1]);
  vec2.scaleAndAdd(cart, cart, abc[2], bc[2]);
  return Array.prototype.slice.call(cart);
}


function simplifyWithUvs(abc, abcUv, geom, detail) {
  var remove = geom.positions.length - detail;
  var tGeom = convert.geomToThree(geom);
  var tSimplified = modifier.modify(tGeom, remove);
  var simplified = convert.threeToGeom(tSimplified);
  return simplified;
}


module.exports = simplifyWithUvs;




const meshSimplify = require('mesh-simplify');

function baryToCart(abc, bc) {
  var cart = vec2.create();
  vec2.scaleAndAdd(cart, cart, abc[0], bc[0]);
  vec2.scaleAndAdd(cart, cart, abc[1], bc[1]);
  vec2.scaleAndAdd(cart, cart, abc[2], bc[2]);
  return Array.prototype.slice.call(cart);
}


function simplifyWithUvs2(abc, abcUv, geom, detail) {
  var simplify = meshSimplify(geom.cells, geom.positions);
  simplified = simplify(detail);
  simplified.uvs = simplified.positions.map(p => {
    var bc = cartToBary(abc, xz(p));
    var uv = baryToCart(abcUv, bc);
    return uv;
  });
  return simplified;
}


// module.exports = simplifyWithUvs2;
