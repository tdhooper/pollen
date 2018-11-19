var workerpool = require('workerpool');
const simplify = require('../geometry/simplify');


workerpool.worker({
  simplify: function(abc, abcUv, geom, detail) {
    var transform = geom.cells.length + ' > ' + detail;
    console.log('simplify start ' + transform);
    var simplified = simplify(abc, abcUv, geom, detail);
    console.log('simplify done ' + transform);
    return simplified;
  }
});
