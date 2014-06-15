
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

var VTL = require('./main.js');
vtl = new VTL('aissh.vesseltracker.com', 44448);
vtl.listen();


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

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
	console.log(socket.id);
	// socket.emit('msg', { hello: 'world' });
	socket.on('my other event', function (data) {
		console.log(data);
	});
	socket.on('config', function(data){
		if (data.mmsi){
			vtl.addSocket(data.mmsi, socket);
			console.log("added socket for mmsi %s", data.mmsi);
			socket.emit("msg", "added for mmsi " + data.mmsi + "\n");
		}
	})

});