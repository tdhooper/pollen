var normalize = require('vectors/normalize-nd');
var IndexCache = require('./index-cache');


function schwarz(complex, abcUv) {
    var positions = complex.positions.slice();
    var cells = complex.cells;
    var newCells = [];

    var positionsUvs = positions.map(function(position) {
        return {
            position: position,
            uv: abcUv[0]
        };
    });

    var positionsUvsCache = new IndexCache(
        createMidpoint.bind(this, positionsUvs, abcUv),
        positionsUvs
    );

    cells.forEach(function(cell) {
        var a = cell[0];
        var b = cell[1];
        var c = cell[2];
        var center = positionsUvsCache.get(a, b, c);
        var ab = positionsUvsCache.get(a, b);
        var bc = positionsUvsCache.get(b, c);
        var ca = positionsUvsCache.get(c, a);
        newCells.push([a, ab, center]);
        newCells.push([ab, b, center]);
        newCells.push([b, bc, center]);
        newCells.push([bc, c, center]);
        newCells.push([c, ca, center]);
        newCells.push([ca, a, center]);
    });

    return {
        cells: newCells,
        positions: positionsUvs.map(function(puv) { return puv.position; }),
        uvs: positionsUvs.map(function(puv) { return puv.uv; })
    };
}

function createMidpoint(positionsUvs, abcUv, a, b, c) {
    var indicies = [a, b];
    if (c !== undefined) {
        indicies.push(c);
    }

    var midpoint = indicies.reduce(function(acc, current) {
        var position = positionsUvs[current].position;
        acc[0] += position[0];
        acc[1] += position[1];
        acc[2] += position[2];
        return acc;
    }, [0, 0, 0]);

    normalize(midpoint);

    var positionUv = {
        position: midpoint,
        uv: c == undefined ? abcUv[1] : abcUv[2]
    };

    return positionUv;
}

module.exports = schwarz;
