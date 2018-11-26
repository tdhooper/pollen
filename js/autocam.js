const vec2 = require('gl-matrix').vec2;


class AutoCam {

    constructor(camera) {
      this.camera = camera;
      this.vec2scratch0 = vec2.create();
      this.focus = undefined;
    }

    focusOn(pollenet) {
      this.focus = pollenet;
    }

    tick() {
      var diff = this.vec2scratch0;
      var center = this.camera.center;

      if (this.focus) {

        vec2.sub(diff, this.focus.position, center);
        vec2.scale(diff, diff, .1);
        vec2.add(center, center, diff);

        var dist = this.focus.particle.radius * 10.;
        this.camera.distance += (dist - this.camera.distance) * .1;
      }
    }
}


module.exports = AutoCam;
