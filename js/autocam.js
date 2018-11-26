const vec2 = require('gl-matrix').vec2;
const quat = require('gl-matrix').quat;
const quat2 = require('gl-matrix').quat2;
const lerp = require('lerp');

var mod = function(t, n) {
    return ((t%n)+n)%n;
};

class AutoCam {

    constructor(camera) {
      this.camera = camera;
      this.vec2scratch0 = vec2.create();

      var quatScratch0 = quat.create();
      var quatScratch1 = quat.create();

      this.states = [
        t => ({
          center: [0,0,0],
          distance: 2,
          rotation: quat.fromEuler(
            quatScratch0,
            55,
            20,
            (Math.sin(t * .0002) * .5 + .5) * 180 + 90
          )
        }),
        t => ({
          center: [0,0,0],
          distance: 10,
          rotation: quat.fromEuler(quatScratch1, 0, 0, 180)
        })
      ];
    }

    lerpStates(r, a, b, t) {
      vec2.lerp(r.center, a.center, b.center, t);
      r.distance = lerp(a.distance, b.distance, t);
      quat.slerp(r.rotation, a.rotation, b.rotation, t);
    }

    focusOn(pollenet) {
      this.focus = pollenet;
      this.focusTime = Date.now();
    }

    tick() {
      var t = Date.now();
      var stateA = this.states[0](t);
      var stateB = this.states[1](t);
      var blend = Math.sin(t * .0001) * .5 + .5;
      // blend = 0.;
      this.lerpStates(this.camera, stateA, stateB, blend);

      // quat.fromEuler(this.camera.rotation, 90,0,0);

      /*
      var diff = this.vec2scratch0;
      var center = this.camera.center;

      if (this.focus) {

        vec2.sub(diff, this.focus.position, center);
        vec2.scale(diff, diff, .1);
        vec2.add(center, center, diff);

        var dist = this.focus.particle.radius * 10.;
        this.camera.distance += (dist - this.camera.distance) * .1;
      }*/
    }
}


module.exports = AutoCam;
