var PORT = 6000;
var dgram = require('dgram');
var server = dgram.createSocket({ type: "udp4", reuseAddr: true });
server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});
server.on('message', function (message, remote) {
    console.log(remote.address + ':' + remote.port +' - ' + message);
});
server.bind(PORT, '0.0.0.0', false);
