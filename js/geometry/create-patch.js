const subdivide = require('./subdivide');


module.exports = function(detail) {
  var abcUv = [
    [1, 1],
    [0, 1],
    [1, 0]
  ];
  var geom = {
      cells: [
        [0, 1, 2]
      ],
      positions: [
        [0, 0, 0],
        [0, 0, 1],
        [1, 0, 0]
      ],
      uvs: abcUv,
  };

  var LODs = [geom];

  while (detail-- > 0) {
    LODs.push(subdivide(LODs[LODs.length - 1]));
  }

  return LODs;
};

