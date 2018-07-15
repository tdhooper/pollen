
const setupPass = regl({
  vert: `
    precision mediump float;
    attribute vec2 position;
    void main () {
      gl_Position = vec4(2. * position - 1., 0, 1);
    }`,
  attributes: {
    position: [
      -2, 0,
      0, -2,
      2, 2
    ],
  },
  count: 3,
});

module.exports = setupPass;
