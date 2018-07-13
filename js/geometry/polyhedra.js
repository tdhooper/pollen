var normalize = require('vectors/normalize-nd');
var polyhedra = require('polyhedra');
var schwarz = require('./schwarz');
var subdivide = require('./subdivide');

function create(poly, subdivisions, abcUv) {
    var cells = poly.face.slice();
    var positions = poly.vertex.slice();
    positions.forEach(normalize);
    var complex = {
        cells: cells,
        positions: positions
    };
    complex = schwarz(complex, abcUv);
    while (subdivisions-- > 0) {
        complex = subdivide(complex);
    }
    return complex;
}

module.exports = {
    icosahedron: create.bind(this, polyhedra.platonic.Icosahedron),
    tetrahedron: create.bind(this, polyhedra.platonic.Tetrahedron)
};
