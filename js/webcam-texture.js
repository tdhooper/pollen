
var WebcamTexture = function(regl) {
    this.ready = false;

    this.video = document.createElement('video');
    this.video.width = 200;
    this.video.autoplay = true;
    this.video.controls = true;
    this.video.setAttribute('playsinline', 'playsinline');

    // document.body.appendChild(this.video);

    this.texture = regl.texture();

    navigator.mediaDevices.enumerateDevices().then(function(e) {
        console.log(e);
    });

    this.startStream();
};

WebcamTexture.prototype.startStream = function() {
    console.log('Starting stream...');
    var constraints = {
        video: true,
        // video: {
        //     deviceId: {exact: '60f187ac2825165f0d813c0a7743e8691ad84a5775427c7146ad2239a3a900b2'},
        // }
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(this.getVideoFromStream.bind(this))
        .then(this.texture)
        .catch(err => { 
            console.log(err.name + ": " + err.message);
            console.log('Restarting in 1 second');
            setTimeout(this.startStream.bind(this), 1000);
        });
};

WebcamTexture.prototype.getVideoFromStream = function(stream) {
    console.log('Got stream');
    var track = stream.getVideoTracks()[0];
    track.onended = this.streamEnded.bind(this);
    this.video.srcObject = stream;
    return new Promise((resolve, reject) => {
        this.video.onloadedmetadata = function(e) {
            if ( ! this.video.videoHeight || ! this.video.videoWidth) {
                reject(new Error('Invalid video size'));
            } else {
                console.log('Got video');
                this.ready = true;
                resolve(this.video);
            }
        }.bind(this);
    });
};

WebcamTexture.prototype.streamEnded = function() {
    console.log('Stream ended');
    this.ready = false;
    console.log('Restarting in 1 second');
    setTimeout(this.startStream.bind(this), 1000);
};

WebcamTexture.prototype.update = function() {
    if (this.ready) {
        this.texture(this.video);
    }
};

module.exports = WebcamTexture;