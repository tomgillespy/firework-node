
var $nodeName = '';
var $wsport = 8080;
var $isConn = false;
var $bready = false;
var $ws_connection = null;
var $relays = false;

var $args = process.argv;
$nodeName = $args[2];
if ((typeof $args[2] == 'undefined') || ($args[2] == '')) {
	console.log('You must provide a node name');
	process.exit(1);
}
console.log('My Node Name is ' + $nodeName);
//Setup
var WebSocketServer = require('ws').Server, wss = new WebSocketServer({ port: $wsport });
var five = require("johnny-five"),  board = new five.Board();
board.on("ready", function() {
  var led = new five.Led(13);
  led.pulse(2000);
  $bready = true;
  var button = new five.Button(22);
	var igniter = new five.Pin(30);
	var statpin = new five.Pin({
    pin: 35,
    type: "digital",
    mode: five.Pin.INPUT,
  });
	this.io.digitalWrite(35, this.io.HIGH);
	statpin.read(function(error, value) {
  console.log(value); // This should write 1
});

	$ig = false;
	statpin.query(function(state) {
		console.log(state);
	})
	statpin.on("high", function() {
		console.log("Monitor High");
	});
	statpin.on("low", function() {
		console.log("Monitor Low");
	});
  button.on("press", function() {
    console.log('Pressed');
		if ($ig) {
			igniter.low();
			$ig = false;
		} else {
			igniter.high();
			$ig = true;
		}
  });
	button.on("hold", function(time) {
    console.log('hold for ' + time);
    if ($isConn) {
      $ws_connection.send('Pin Gone High');
    }
  });
  $relays = new five.Relays([{pin: 46, type: 'NC'},
                                {pin: 47, type: 'NC'},
                                {pin: 48, type: 'NC'},
                                {pin: 49, type: 'NC'},
                                {pin: 50, type: 'NC'},
                                {pin: 51, type: 'NC'},
                                {pin: 52, type: 'NC'},
                                {pin: 53, type: 'NC'}]);
  $relays.open();
  console.log('Board Initialized');
});
wss.on('error', function(event) {
  console.log('Websocket Error Encountered');
  console.log(event);
});
wss.on('connection', function connection(ws) {
  if ($isConn) {
    ws.close(1000, 'Only 1 Connection Allowed');
    return;
  }
  ws.on('message', function incoming(message) {
    try
    {
       var json = JSON.parse(message);
    }
    catch(e)
    {
       console.log('recieved: %s', message);
       return;
    }
    console.log(json);
    console.log($relays);
    if (json.type == 'relay') {
      $relays[json.index].toggle();
    }
  });
  $isConn = true;
  $ws_connection = ws;
  console.log(ws);
  ws.send('Hello Connection');
});

var udpport = 6000;
var dgram = require('dgram');
var server = dgram.createSocket({ type: "udp4", reuseAddr: true });

server.bind(function() {
    server.setBroadcast(true);
    setInterval(broadcastNew, 10000);
});

function broadcastNew() {
    var message = new Buffer($nodeName);
    server.send(message, 0, message.length, udpport, "255.255.255.255", function() {
        console.log('Sent: ' + $nodeName);
    });
}
