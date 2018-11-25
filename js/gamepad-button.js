const EventEmitter = require('events');


class GamepadButton extends EventEmitter {

  constructor(gamepadIndex, buttonIndex) {
    super();
    this.gamepadIndex = gamepadIndex;
    this.buttonIndex = buttonIndex;
    this.running = false;
  }

  start() {
    if ( ! this.running) {
      this.running = true;
      this.update();
    }
  }

  stop() {
    this.running = false;
  }

  update() {
    if ( ! this.running) {
      return;
    }
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    var gamepad = gamepads[this.gamepadIndex];
    if (gamepad) {
      var pressed = gamepad.buttons[this.buttonIndex].pressed;
      if (pressed !== this.wasPressed) {
        this.emit('change', pressed);
        this.wasPressed = pressed;
      }
    }
    requestAnimationFrame(this.update.bind(this));
  }
}


module.exports = GamepadButton;
