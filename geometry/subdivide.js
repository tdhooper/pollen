var normalize = require('vectors/normalize-nd');
var IndexCache = require('./index-cache');


function subdivide(complex) {
    var positions = complex.positions.slice();
    var uvs = complex.uvs.slice();
    var cells = complex.cells;
    var newCells = [];

    var positionsCache = new IndexCache(
        createMidpoint.bind(this, positions),
        positions
    );

    var uvsCache = new IndexCache(
        createMidpointUv.bind(this, uvs),
        uvs
    );

    cells.forEach(function(cell) {
        var a = cell[0];
        var b = cell[1];
        var c = cell[2];

        var ab = positionsCache.get(a, b);
        var bc = positionsCache.get(b, c);
        var ca = positionsCache.get(c, a);

        uvsCache.get(a, b);
        uvsCache.get(b, c);
        uvsCache.get(c, a);

        newCells.push([a, ab, ca]);
        newCells.push([b, bc, ab]);
        newCells.push([c, ca, bc]);
        newCells.push([ab, bc, ca]);
    });

    return {
        cells: newCells,
        positions: positions,
        uvs: uvs
    };
}

function createMidpoint(positions, a, b) {
    var va = positions[a];
    var vb = positions[b];
    var v = [
        va[0] + vb[0],
        va[1] + vb[1],
        va[2] + vb[2]
    ];
    normalize(v);
    return v;
}

function createMidpointUv(uvs, a, b) {
    var va = uvs[a];
    var vb = uvs[b];
    var v = [
        (va[0] + vb[0]) / 2,
        (va[1] + vb[1]) / 2
    ];
    return v;
}

module.exports = subdivide;
