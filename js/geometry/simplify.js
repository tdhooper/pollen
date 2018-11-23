import { SimplifyModifier } from '../lib/SimplifyModifier';

const convert = require('./convert-three');


const modifier = new SimplifyModifier();


function simplifyWithUvs(geom, reduction) {
  var remove = Math.round(geom.positions.length * reduction);
  var tGeom = convert.geomToThree(geom);
  var tSimplified = modifier.modify(tGeom, remove);
  var simplified = convert.threeToGeom(tSimplified);
  return simplified;
}


module.exports = simplifyWithUvs;

