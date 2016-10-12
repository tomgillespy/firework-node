var PORT = 6000;
var BROADCAST_ADDR = "255.255.255.255";
var dgram = require('dgram');
var server = dgram.createSocket({ type: "udp4", reuseAddr: true });

server.bind(function() {
    server.setBroadcast(true);
    setInterval(broadcastNew, 10000);
});

function broadcastNew() {
    var message = new Buffer("Broadcast message!");
    server.send(message, 0, message.length, PORT, BROADCAST_ADDR, function() {
        console.log("Sent '" + message + "'");
    });
}
