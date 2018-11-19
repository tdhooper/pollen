import { Vector3 } from 'three/src/math/Vector3';
import { Face3 } from 'three/src/core/Face3';
import { Geometry } from 'three/src/core/Geometry';


var _threeToGeom = function(abc, abcUv, tGeom) {
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


var threeToGeom = function(tGeom) {
  if (tGeom.isBufferGeometry) {
    tGeom = new Geometry().fromBufferGeometry(tGeom);
  }
  var positions = tGeom.vertices.map(function(vert) {
      return [vert.x, vert.y, vert.z];
  });
  var cells = tGeom.faces.map(function(face) {
      return [face.a, face.b, face.c];
  });
  return {
    positions: positions,
    cells: cells,
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


module.exports = {
  threeToGeom: threeToGeom,
  geomToThree: geomToThree
};
