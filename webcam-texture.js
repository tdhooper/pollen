
var WebcamTexture = function(regl) {
    this.ready = false;

    this.video = document.createElement('video');
    this.video.width = 200;
    this.video.autoplay = true;
    this.video.controls = true;
    this.video.setAttribute('playsinline', 'playsinline');

    document.body.appendChild(this.video);

    this.texture = regl.texture();

    var constraints = {
        video: {
            facingMode: 'environment'
        }
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(this.gotStream.bind(this))
        .catch(function(err) {
            console.log(err.name + ": " + err.message);
        });
};

WebcamTexture.prototype.gotStream = function(stream) {
    this.video.srcObject = stream;
    this.video.onloadedmetadata = function(e) {
        this.video.play();
        this.texture(this.video);
        this.ready = true;
    }.bind(this);
};

WebcamTexture.prototype.update = function() {
    if (this.ready) {
        this.texture.subimage(this.video);
    }
};

module.exports = WebcamTexture;