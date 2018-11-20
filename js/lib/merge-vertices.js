
function mergeVertices(cells, positions, uvs) {

  function hashPosition(position) {
    return JSON.stringify(position, function(key, val) {
      return val.toFixed ? Number(val.toFixed(3)) : val;
    });
  }

  var positionUvLookup = {};
  positions.forEach(function(position, i) {
    positionUvLookup[hashPosition(position)] = [
      position,
      uvs[i]
    ];
  });

  var keys = Object.keys(positionUvLookup);

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
    return positionUvLookup[key][0];
  });

  var uvs = keys.map(function(key) {
    return positionUvLookup[key][1];
  });

  return {
    cells: cells,
    positions: positions,
    uvs: uvs
  };
}

module.exports = mergeVertices;