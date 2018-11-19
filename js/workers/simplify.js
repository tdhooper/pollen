var workerpool = require('workerpool');


var pool = workerpool.pool(__dirname + '/simplify-worker.js');
 
module.exports = function(abc, abcUv, geom, detail) {
  return pool.exec('simplify', [abc, abcUv, geom, detail]);
};
