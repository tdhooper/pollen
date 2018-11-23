var workerpool = require('workerpool');
const simplify = require('../geometry/simplify');


workerpool.worker({
  simplify: function(geom, detail) {
    var transform = geom.cells.length + ' > ' + detail;
    console.log('simplify start ' + transform);
    var simplified = simplify(geom, detail);
    console.log('simplify done ' + transform);
    return simplified;
  }
});
