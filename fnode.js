var repl = require('repl');
var localr = repl.start("fwork::> ");
var $wsport = 8080;
var $isConn = false;
var $bready = false;
var $ws_connection = null;
var $relays = false;
var $pins = false;
var $args = process.argv;
var $channels = 0;
var $isArmed = false;

//Cmd Args
if ((typeof $args[2] == 'undefined') || ($args[2] == '')) {
	console.log('You must provide a node name');
	process.exit(1);
} else {
	$nodeName = $args[2];
}
if ((typeof $args[3] == 'undefined') || ($args[3] == '')) {
	console.log('No channels provided, using 8');
	$channels = 8;
} else {
	$channels = $args[3];
}
console.log('My Node Name is ' + $nodeName);
console.log('I have ' + $channels + ' channels');

//Setup Network Server

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({ port: $wsport });
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
			 switch(json.event) {
				 case 'fire':
				 	firechannel(json.channel);
					break;
			 }
    }
    catch(e)
    {
       console.log('recieved: %s', message);
       return;
    }
  });
	ws.on('close', function() {
		$isConn = false;
		console.log('Controller Disconnected');
	});
  $isConn = true;
  $ws_connection = ws;
  ws.send(JSON.stringify({event: 'connection', channels: $channels, name: $nodeName}));
});

//Setup autodiscover
var udpport = 6000;
var dgram = require('dgram');
var server = dgram.createSocket({ type: "udp4", reuseAddr: true });
server.bind(function() {
    server.setBroadcast(true);
    setInterval(broadcastNew, 10000);
		console.log('Autodiscovery Started');
});

function broadcastNew() {
    var message = new Buffer($nodeName);
    server.send(message, 0, message.length, udpport, "255.255.255.255", function() {

    });
};
broadcastNew(); //Boradcast Packet Immediatly.

//Setup Board
var five = require("johnny-five"),  board = new five.Board({
	repl: false,
});
board.on("ready", function() {
	$bready = true;
	$relays = new five.Relays([{pin: 46, type: 'NC'},
																{pin: 47, type: 'NC'},
																{pin: 48, type: 'NC'},
																{pin: 49, type: 'NC'},
																{pin: 50, type: 'NC'},
																{pin: 51, type: 'NC'},
																{pin: 52, type: 'NC'},
																{pin: 53, type: 'NC'}]);
  console.log('Open relays');
	$relays.open();
	var firebutton = new five.Button(22);
	var indicator = new five.Led(12);
	indicator.pulse(2000);
	firebutton.on('press', function() {
		console.log('Arm/Disarm Pressed');
		if ($isArmed) {
			$isArmed = false;
			disarm();
			indicator.pulse(2000);
		} else {
			arm();
			$isArmed = true;
			indicator.strobe(1000);
		}
	});
	var startpin = 38;
	$pins = [];
	console.log($pins);
	for(i = 0; i <= 7; i++) {
		(function(i) {
			var thispin = new five.Pin({
				pin: startpin + i,
				type: "digital",
				mode: five.Pin.INPUT,
			});
			//thispin.high(); //Write high to enable internal pullup.
			board.io.digitalWrite(startpin + i, board.io.HIGH);
			thispin.on('high', function() {
				console.log((i + 1) + ' Disconnected');
				disconnectfirework(i + 1);
			});
			thispin.on('low', function() {
				console.log((i + 1)  + ' Connected');
				connectfirework(i + 1);
			});
			$pins.push(thispin);
			console.log(startpin + i);
		})(i);
	}
});
board.on("fail", function(event) {
	console.log('Board Failed to Initialize');
	//console.log(event);
});


function isValidChannel($channel) {
	if ($channel < 1) {
		return false;
	} else if ($channel > $channels) {
		return false;
	}
	return true;
}

function connectfirework($channel) {
	if ($isConn) {
		if (isValidChannel($channel)) {
			$ws_connection.send(JSON.stringify({event: 'connected', channel: $channel}));
			return 'Event Sent';
		} else {
			return 'Invalid Channel';
		}
	} else {
		return 'No Connection';
	}
}
function disconnectfirework($channel) {
	if ($isConn) {
		$ws_connection.send(JSON.stringify({event: 'disconnected', channel: $channel}));
		return 'Event Sent';
	} else {
		return 'No Connection';
	}
}
function firechannel($channel) {
	if ($isArmed) {
		console.log('Firing Channel ' + $channel);
		$relays[$channel - 1].close();
		setTimeout(function() {
			console.log('Channel Fired');
			$relays[$channel - 1].open();
		}, 1000);
	} else {
		console.log('Not Armed');
	}
}
function arm() {
	if ($isConn) {
		$ws_connection.send(JSON.stringify({event: 'arm'}));
		return 'Armed.';
	} else {
		return 'No Connection';
	}
}
function disarm() {
	if ($isConn) {
		$ws_connection.send(JSON.stringify({event: 'disarm'}));
		return 'Disarmed.';
	} else {
		return 'No Connection';
	}
}

localr.context.connect = connectfirework;
localr.context.disconnect = disconnectfirework;
localr.context.arm = arm;
localr.context.disarm = disarm;
localr.context.fire = firechannel;
