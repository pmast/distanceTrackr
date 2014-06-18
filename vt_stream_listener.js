var net = require('net');
var LatLon = require('./geo.js');


function VTListener(){
	this.vessels = {};
	this.tmp_msg = null;
	this.message_count = 0;
	this.unparsable_count = 0;
	this.merged_count = 0;
	this.io = null;

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

VTListener.prototype.listen = function(url, port, broadcast){
	this.url = url;
	this.port = port;
	this.broadcast = broadcast;
	this.client.connect(this.port, this.url);
}


// nc aissh.vesseltracker.com 44448 

VTListener.prototype.__process_message = function (message){
	if (message.msgid <=3){
		var point = new LatLon(message.pos[1], message.pos[0]);
		var vessel = null
		if (!this.vessels[message.userid]){
			vessel = {
				points:[point],
				distance: 0,
				mmsi: message.userid,
				first: new Date(),
				last: new Date()
			};
			this.vessels[message.userid] = vessel;
		} else {
			vessel = this.vessels[message.userid]
			if (vessel.points.length>0){
				vessel.distance += vessel.points[vessel.points.length-1].distanceTo(point);
				vessel.points = vessel.points.slice(vessel.points.length-11, vessel.points.length);
			}
			vessel.points.push(point);
			vessel.last = new Date();
		}
		this.broadcast(vessel);
	} else if (message.msgid == 5){
		if (this.vessels[message.userid]){
			var name = message.name.trim().split('@')[0];
			this.vessels[message.userid].name = name;

			this.broadcast(this.vessels[message.userid]);
		}
	}
	// console.log(Object.keys(this.vessels).length);
}

VTListener.prototype.getVessel = function(mmsi){
	if (this.vessels[mmsi]){
		return this.vessels[mmsi];
	}
}

VTListener.prototype.reset = function(mmsi){
	if (this.vessels[mmsi]){
		this.vessels[mmsi].distance = 0;
		this.vessels[mmsi].first = new Date();
		this.broadcast(this.vessels[mmsi], 3);
	}
}

module.exports = new VTListener();