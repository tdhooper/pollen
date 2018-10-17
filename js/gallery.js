
module.exports = function() {
    var channel = new BroadcastChannel('pollen');
    channel.onmessage = function (ev) {
        console.log(ev);
    };
};
