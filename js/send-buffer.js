
function bufferToObj(buffer) {
  return new Promise((resolve, reject) => {
    regl({framebuffer: buffer})(() => {
      var pixels = regl.read();
      resolve({
        width: buffer.width,
        height: buffer.height,
        pixels: pixels
      });
    });
  });
}

var canvas = document.createElement('canvas');

function objToBlob(obj) {
  return new Promise((resolve, reject) => {
    var data = new ImageData(
      new Uint8ClampedArray(obj.pixels),
      obj.width,
      obj.height
    );
    canvas.width = obj.width;
    canvas.height = obj.height;
    var ctx = canvas.getContext('2d');
    ctx.putImageData(data, 0, 0);
    canvas.toBlob(resolve);
  });
}

function bufferToBlob(buffer) {
  return bufferToObj(buffer).then(objToBlob);
}

module.exports = {
  bufferToObj: bufferToObj,
  objToBlob: objToBlob,
  bufferToBlob: bufferToBlob
};
