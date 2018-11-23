
function mergeVertices(cells, positions, uvs, normals) {

  function hashPosition(position) {
    return JSON.stringify(position, function(key, val) {
      return val.toFixed ? Number(val.toFixed(3)) : val;
    });
  }

  var positionUvNormalLookup = {};
  positions.forEach(function(position, i) {
    positionUvNormalLookup[hashPosition(position)] = [
      position,
      uvs[i],
      normals[i]
    ];
  });

  var keys = Object.keys(positionUvNormalLookup);

  var indexLookup = {};
  var index = 0;
  keys.forEach(function(key) {
    indexLookup[key] = index;
    index++;
  });

  cells = cells.map(function(cell) {
    return cell.map(function(index) {
      var hash = hashPosition(positions[index])
      return indexLookup[hash];
    })
  });

  positions = keys.map(function(key) {
    return positionUvNormalLookup[key][0];
  });

  var uvs = keys.map(function(key) {
    return positionUvNormalLookup[key][1];
  });

  var normals = keys.map(function(key) {
    return positionUvNormalLookup[key][2];
  });

  return {
    cells: cells,
    positions: positions,
    uvs: uvs,
    normals: normals
  };
}

module.exports = mergeVertices;