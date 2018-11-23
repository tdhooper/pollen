var slice = require('sliced')

module.exports = combine

function combine(meshes) {
  var pos = []
  var uvs = []
  var nor = []
  var cel = []
  var p = 0
  var c = 0
  var k = 0

  for (var i = 0; i < meshes.length; i++) {
    var mpos = meshes[i].positions
    var muvs = meshes[i].uvs
    var mnor = meshes[i].normals
    var mcel = meshes[i].cells

    for (var j = 0; j < mpos.length; j++) {
      pos[j + p] = slice(mpos[j])
      if (muvs) {
        uvs[j + p] = slice(muvs[j])
      }
      if (mnor) {
        nor[j + p] = slice(mnor[j])
      }
    }

    for (var j = 0; j < mcel.length; j++) {
      cel[k = j + c] = slice(mcel[j])

      for(var l = 0; l < cel[k].length; l++) {
        cel[k][l] += p
      }
    }

    p += mpos.length
    c += mcel.length
  }

  var combined = {
      cells: cel
    , positions: pos
  };

  if (uvs.length) {
    combined.uvs = uvs
  }

  if (nor.length) {
    combined.normals = nor
  }

  return combined
}
