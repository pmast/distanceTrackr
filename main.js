var net = require('net');
var LatLon = require('./geo.js');


function VTListener(url, port){
	this.url = url;
	this.port = port;
	this.vessels = {};
	this.sockets = {};
	this.tmp_msg = null;
	this.message_count = 0;
	this.unparsable_count = 0;
	this.merged_count = 0;

	this.peter = "hans";

	this.client = net.Socket();
	this.client.setEncoding('utf8');

	var t = this;
	this.client.on('data', function(data){
		this.message_count++;
		data = data.trim();
		// if message is not complete json element
		// keep part and try to add it to next message
		
		// if there is allread a kept part and received message is not complete
		// add the kept part to the recieved message
		if (this.tmp_msg && data[0]!='{'){
			data = this.tmp_msg + data;
			this.tmp_msg = null;
		}

		// if part is not complete keep it
		if (data[data.length-1]!='}'){
			this.tmp_msg = data;
			this.merged_count++;
			return;
		}

		data = data.split("\r\n");
		r = []
		data.map(function(item){
			try{
				r.push(JSON.parse(item));;
			} catch(e) {
				this.unparsable_count++;
				return;
			}
		});

		r.map(t.__process_message.bind(t));
	})
}

VTListener.prototype.listen = function(){
	this.client.connect(this.port, this.url);
}


// nc aissh.vesseltracker.com 44448 





// client.connect(44448, 'aissh.vesseltracker.com');

VTListener.prototype.__filter = function (cb, message){
	// console.log(message.userid);
	if (MMSIs.indexOf(message.userid) >= 0) cb(message);
}

VTListener.prototype.__process_message = function (message){
	if (message.msgid <=3){
		var point = new LatLon(message.pos[1], message.pos[0]);
		if (!this.vessels[message.userid]){
			this.vessels[message.userid] = {
				points:[point],
				distance: 0,
				mmsi: message.userid
			}
		} else {
			var vessel = this.vessels[message.userid]
			if (vessel.points.length>0){
				vessel.distance += vessel.points[vessel.points.length-1].distanceTo(point);
				vessel.points = vessel.points.slice(vessel.points.length-11, vessel.points.length-1);
			}
			vessel.points.push(point);
			this.broadcastLast(vessel);
		}
	}
	// console.log(Object.keys(this.vessels).length);
}

VTListener.prototype.getData = function(mmsi){
	return this.vessels[mmsi];
}

VTListener.prototype.addSocket = function(mmsi, socket){
	if (!this.sockets[mmsi]){
		this.sockets[mmsi]={};
		this.sockets[mmsi][socket.id] = socket;
	} else {
		this.sockets[mmsi][socket.id] = socket;
	}
	console.log('number of sockets: %s', Object.keys(this.sockets[mmsi]).length);
}

VTListener.prototype.broadcastLast = function(vessel){
	if (this.sockets[vessel.mmsi]){
		console.log('number of sockets: %s', Object.keys(this.sockets[vessel.mmsi]).length);
		for (client in this.sockets[vessel.mmsi]){
			this.sockets[vessel.mmsi][client].emit("msg", vessel);
		}
	}
}

module.exports = VTListener;