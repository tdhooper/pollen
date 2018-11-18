const meshSimplify = require('mesh-simplify');
const cartToBary = require('barycentric');
const vec2 = require('gl-matrix').vec2;
const xz = require('./xz');


function baryToCart(abc, bc) {
  var cart = vec2.create();
  vec2.scaleAndAdd(cart, cart, abc[0], bc[0]);
  vec2.scaleAndAdd(cart, cart, abc[1], bc[1]);
  vec2.scaleAndAdd(cart, cart, abc[2], bc[2]);
  return cart;
}


function simplifyWithUvs(abc, abcUv, geom, details) {
  debugger;
  var simplify = meshSimplify(geom.cells, geom.positions);
  debugger;
  simplify(100);
  debugger;
  var LODs = details.map(simplify);
  debugger;
  LODs.forEach(LOD => {
    LOD.uvs = LOD.positions.map(p => {
      var bc = barycentric(abc, xz(p));
      var uv = baryToCart(abcUv, bc);
      return uv;
    });
  });
  return LODs;  
}


module.exports = function(abc, abcUv, geom, heightMap) {
  var details = [10, 40, 160];
  return simplifyWithUvs(abc, abcUv, geom, details);
};
