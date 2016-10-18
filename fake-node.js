var repl = require('repl');
var localr = repl.start("fwork::> ");
var $wsport = 8080;
var $isConn = false;
var $bready = false;
var $ws_connection = null;
var $relays = false;
var $args = process.argv;
var $channels = 0;

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



//Setup

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
    }
    catch(e)
    {
       console.log('recieved: %s', message);
       return;
    }
    console.log(json);
    console.log($relays);
  });
  $isConn = true;
  $ws_connection = ws;
  console.log(ws);
  ws.send(JSON.stringify({channels: $channels, name: $nodeName}));
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
};

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
	console.log('Firing Channel ' + $channel);
	disconnectfirework($channel);
	setTimeout(function() {
		console.log('Channel Fired');
	}, 1000);
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

localr.context.connectfirework = connectfirework;
localr.context.disconnectfirework = disconnectfirework;
localr.context.arm = arm;
localr.context.disarm = disarm;
