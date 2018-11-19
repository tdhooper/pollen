
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

function urlToImg(url) {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.onload = evt => {
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function objUVLookup(obj, uv) {
  var x = Math.round((obj.width - 1) * uv[0]);
  var y = Math.round((obj.height - 1) * uv[1]);
  var pixel = y * obj.width + x;
  return obj.pixels.slice(pixel * 4, pixel * 4 + 4);
}

module.exports = {
  bufferToObj: bufferToObj,
  objToBlob: objToBlob,
  bufferToBlob: bufferToBlob,
  urlToImg: urlToImg,
  objUVLookup: objUVLookup
};
