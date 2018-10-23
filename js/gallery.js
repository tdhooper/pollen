var store = require('./store');


module.exports = function() {

  var channel = new BroadcastChannel('pollen');

  channel.onmessage = function(evt) {
    var source = evt.data;
    store.save(source);
  };
};
