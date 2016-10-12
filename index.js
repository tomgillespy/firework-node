var $wsport = 8080;
var $isConn = false;
var $bready = false;
var $ws_connection = null;
var $relays = false;
//Setup
var WebSocketServer = require('ws').Server, wss = new WebSocketServer({ port: $wsport });
var five = require("johnny-five"),  board = new five.Board();

board.on("ready", function() {
  var led = new five.Led(13);
  led.pulse(2000);
  $bready = true;
  var checkpin = new five.Pin({
    pin: 22,
    type: "digital",
    mode: five.Pin.INPUT,
  });
  checkpin.on("high", function() {
    console.log('Pin High');
    if ($isConn) {
      $ws_connection.send('Pin Gone High');
    }
  });
  checkpin.on("low", function(event) {
    console.log('Pin Low');
    if ($isConn) {
      $ws_connection.send('Pin Gone Low');
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
