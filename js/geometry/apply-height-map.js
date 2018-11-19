const simplify = require('../workers/simplify');


module.exports = function(abc, abcUv, geom, heightMap) {
  var details = [10, 40, 160];
  return Promise.all(details.map(simplify.bind(this, abc, abcUv, geom)));
};
