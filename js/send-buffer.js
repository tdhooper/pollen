
function bufferToArray(buffer) {
  return new Promise(function(resolve, reject) {
    regl({framebuffer: buffer})(() => {
      regl.clear({color: [0, 0, 0, 1]});
      var pixels = regl.read();
      resolve(pixels);
    });
  });
}

function arrayToBuffer(pixels, buffer) {
  buffer.data(pixels);
}

module.exports = {
    bufferToObj: bufferToArray,
    arrayToBuffer: arrayToBuffer
};
