const EventEmitter = require('events');
const GamepadButton = require('./gamepad-button');


var COOLING_OFF_PERIOD = 1000;

var emitter = new EventEmitter();
var button = new GamepadButton(0, 1);
var wasPressed;
var pressedTime = 0;

button.on('change', pressed => {
  var time = Date.now();
  var elapsed = time - pressedTime;
  if (wasPressed === true && pressed === false && elapsed > COOLING_OFF_PERIOD) {
    emitter.emit('click');
    pressedTime = time;
  }
  wasPressed = pressed;
});

button.start();


module.exports = emitter;
