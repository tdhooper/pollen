import { SimplifyModifier } from '../lib/SimplifyModifier';
// import { simplifyMesh } from '../lib/SimplifyModifier2';

const cartToBary = require('barycentric');
const vec2 = require('gl-matrix').vec2;
const xz = require('./xz');
const convert = require('./convert-three');


function baryToCart(abc, bc) {
  var cart = vec2.create();
  vec2.scaleAndAdd(cart, cart, abc[0], bc[0]);
  vec2.scaleAndAdd(cart, cart, abc[1], bc[1]);
  vec2.scaleAndAdd(cart, cart, abc[2], bc[2]);
  return Array.prototype.slice.call(cart);
}


function simplifyWithUvs(abc, abcUv, geom, reduction) {
  var remove = Math.round(geom.positions.length * reduction);
  var tGeom = convert.geomToThree(geom);

  var modifier = new SimplifyModifier();
  var tSimplified = modifier.modify(tGeom, remove);

  // var tSimplified = simplifyMesh(tGeom, remove, true);

  var simplified = convert.threeToGeom(tSimplified);

  simplified.uvs = simplified.positions.map(_ => [0,0]);

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
