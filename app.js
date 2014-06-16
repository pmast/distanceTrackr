
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var sio = require('socket.io');
var app = express();

var vtl = require('./vt_stream_listener.js');



// all environments
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.get(/^\/(\d{9})\/reset\/?$/, function(req, res){
	vtl.reset(req.params[0]);
  // res.end(req.params[0] + "reset!");
  res.redirect('/' + req.params[0]);
});

app.get(/^\/\d{9}\/?$/, function(req, res){
  res.sendfile(__dirname + '/public/index.html');
});


// app.get(/^\/\d{9}\/?/, function(req, res){
//   res.sendfile(__dirname + '/public/index.html');
// });

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// app.get('/', routes.index);
// app.get('/reset', reset);

server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = sio(server);

io.on('connection', function (socket) {

	socket.on('config', function(data){
		if (data.mmsi){
			socket.join(data.mmsi);
			socket.emit("msg", "added for mmsi " + data.mmsi + "\n");
			socket.emit("data", vtl.getVessel(data.mmsi));

			console.log("added socket to room %s", data.mmsi);

		}
	});
});

vtl.listen('aissh.vesseltracker.com', 44448, function (vessel, b){
	if (b){
		io.to(vessel.mmsi).emit("data", vessel);
	} else {
		io.to(vessel.mmsi).emit("data", vessel);
	}
});	