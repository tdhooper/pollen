const vec2 = require('gl-matrix').vec2;
const subdivide = require('./subdivide');


module.exports = function(detail, abc, abcUv) {
  var geom = {
      cells: [
        [0, 1, 2],
        [0, 3, 1]
      ],
      positions: [
        [0, 0, 0],
        abc[0],
        abc[1],
        abc[2]
      ],
      uvs: [
        abcUv[0],
        abcUv[1],
        abcUv[2],
        abcUv[2]
      ]
  };

  var LODs = [geom];

  while (detail-- > 0) {
    LODs.push(subdivide(LODs[LODs.length - 1]));
  }

  return LODs;
};
