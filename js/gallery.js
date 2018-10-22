
module.exports = function() {

  var channel = new BroadcastChannel('pollen');

  // var xhr = new XMLHttpRequest();
  // xhr.open('post', '/save', true);
  // xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  // xhr.addEventListener('load', function() {
  //   console.log(xhr.response);
  // });

  channel.onmessage = function(evt) {
    var blob = evt.data;

    var form = new FormData();
    form.append('image', blob, "image.png");

    fetch('/upload', {method: 'POST', body: form});

    // var dataStr = JSON.stringify({'hiii': 432});
    // xhr.send(blob);
  };

  // create canvas the same size as framebuffer
  // write framebuffer pixels to canvas (could be slow!)
  // canvas.toBlob()
  // upload, returns image id on success
  // submit json with image ids
};
