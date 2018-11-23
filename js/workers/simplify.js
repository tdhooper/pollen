var workerpool = require('workerpool');


var pool = workerpool.pool(__dirname + '/simplify-worker.js');
 
module.exports = function(geom, detail) {
  return pool.exec('simplify', [geom, detail]);
};
