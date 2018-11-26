const vec2 = require('gl-matrix').vec2;
const quat = require('gl-matrix').quat;
const lerp = require('lerp');
const smoothstep = require('smoothstep');


var mod = function(t, n) {
  return ((t%n)+n)%n;
};


const FOCUS_DWELL_TIME = 15000;
const FOCUS_TRANSITION_TIME = 3000;


class AutoCam {

    constructor(camera) {
      this.camera = camera;

      this.targetPosition = vec2.create();
      this.targetRotation = quat.create();
      this.targetDistance = 0;

      this.focusPosition = vec2.create();
      this.focusRotation = quat.create();
      this.focusDistance = 0;

      this.zoomRotation = quat.create();

      this.states = [
        {
          distance: 1.5,
          rotation: this.zoomRotation
        },
        {
          distance: 15,
          rotation: quat.fromEuler([], 0, 0, 180)
        }
      ];

      this.lastTime = Date.now();
      this.idleStateTime = 0;
      this.wasFocussed = false;
      this.focusTime = 0;
    }

    focusOn(pollenet) {
      this.focus = pollenet;
      this.focusTime = Date.now();
    }

    tick() {

      var time = Date.now();
      var elapsed = time - this.lastTime;
      this.lastTime = time;


      // Manage focus

      var focusElapsed = time - this.focusTime;
      var focusStart = smoothstep(
        0,
        FOCUS_TRANSITION_TIME,
        focusElapsed
      );
      var focusEnd = smoothstep(
        FOCUS_TRANSITION_TIME + FOCUS_DWELL_TIME,
        FOCUS_TRANSITION_TIME * 2 + FOCUS_DWELL_TIME,
        focusElapsed
      );
      var focusBlend = focusStart - focusEnd;

      var isFocussed = focusStart && ! focusEnd;
      if (this.wasFocussed && ! isFocussed) {
        this.idleStateTime = 0; // Reset idle to zoomed in state
      }
      this.wasFocussed = isFocussed;


      // Setup idle state

      quat.fromEuler(
        this.zoomRotation, 65, 20,
        (Math.sin(time * .0002) * .5 + .5) * 180 + 90
      );

      this.idleStateTime += elapsed;

      var stateA = this.states[0];
      var stateB = this.states[1];
      var blend = Math.sin(Math.PI / -2 + this.idleStateTime * .0001) * .5 + .5;
      quat.slerp(this.targetRotation, stateA.rotation, stateB.rotation, blend);
      this.targetDistance = lerp(stateA.distance, stateB.distance, blend);


      // Setup focus state

      if (this.focus) {
        this.focusDistance = this.focus.particle.radius * 10;
        quat.copy(this.focusRotation, this.zoomRotation);
        vec2.copy(this.focusPosition, this.focus.position);
      }


      // Apply focus state

      if (focusBlend > 0) {
        vec2.lerp(this.targetPosition, this.targetPosition, this.focusPosition, focusBlend);
        quat.slerp(this.targetRotation, this.targetRotation, this.focusRotation, focusBlend);
        this.targetDistance = lerp(this.targetDistance, this.focusDistance, focusBlend);
      }


      // Increment camera towards state

      vec2.lerp(this.camera.center, this.camera.center, this.targetPosition, .1);
      quat.slerp(this.camera.rotation, this.camera.rotation, this.targetRotation, .1);
      this.camera.distance = lerp(this.camera.distance, this.targetDistance, .1);
    }
}


module.exports = AutoCam;
