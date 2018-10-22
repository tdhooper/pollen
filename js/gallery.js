
module.exports = function() {

  var channel = new BroadcastChannel('pollen');

  channel.onmessage = function(evt) {
    var source = evt.data;
    Promise.all([
      upload(source.height),
      upload(source.image)
    ]).then(filenames => {
      var data = {
        height: filenames[0],
        image: filenames[1],
      };
      submit(data).then(console.log);
    });
  };

  function upload(blob) {
    var form = new FormData();
    form.append('image', blob, "image.png");
    var f = fetch('/upload', {
      method: 'POST',
      body: form
    });
    return f.then(response => {
      return response.text();
    });
  }

  function submit(data) {
    var form = new FormData();
    var f = fetch('/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return f.then(response => {
      return response.text();
    });
  }
};
