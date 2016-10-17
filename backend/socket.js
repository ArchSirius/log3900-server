const User = require('./app/user/user.model');
const Zone = require('./app/zone/zone.model');
const _    = require('lodash');

const MAXCONNECTION = 4;
var connections = 0;

var userNames = (function() {

	var names = {};

	var claim = function (name) {
		connections++;
		if (!name || names[name]) {
			return false;
		}
		else {
			names[name] = true;
			return true;
		}
	};

	var get = function() {
		var res = [];
		for (user in names) {
			res.push(user);
		}
		return res;
	};

	var free = function(name) {
		connections--;
		if (names[name]) {
			delete names[name];
		}
	};

	return {
		claim: claim,
		free: free,
		get: get
	};
}());

// from http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
var guid = function() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
};

// export function for listening to the socket
module.exports = function (socket) {
	var name = '';
	// broadcast a user's message to other users
	socket.on('send:message', function (data) {
		var time = new Date().getTime();
		socket.broadcast.emit('send:message', {
			user: name,
			text: data.message,
			time: time
		});
		socket.emit('send:message', {
			user: name,
			text: data.message,
			time: time
		});
	});

	// clean up when a user leaves, and broadcast it to other users
	socket.on('disconnect', function () {
		socket.broadcast.emit('user:left', {
			name: name,
			time: new Date().getTime()
		});
		userNames.free(name);
	});

	socket.on('reserve:name', function (data) {
		var time = new Date().getTime();
		if (userNames.claim(data.name)) {
			name = data.name;
			socket.emit('reserve:name', {
				success: true,
				time: time
			});
			// send the new user their name and a list of users
			socket.emit('init', {
				name: name,
				users: userNames.get(),
				time: time
			});

			// notify other clients that a new user has joined
			socket.broadcast.emit('user:join', {
				name: name,
				time: new Date().getTime()
			});
		}
		else {
			socket.emit('reserve:name', {
				success: false,
				time: time
			});
		}
	});

	socket.on('edit:node', function(data) {
		const time = new Date().getTime();
		const zoneId = data.zoneId;
		const edit = data.edit;
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			if (zone) {
				var node;
				for (var i = 0; i < zone.nodes.length; ++i) {
					node = zone.nodes[i];
					if (node.id === edit.id) {
						// id and type cannot change
						// Update position
						node.position = _.extend(node.position, edit.position);
						// Update angle
						node.angle = _.extend(node.angle, edit.angle);
						// Update angle
						node.scale = _.extend(node.scale, edit.scale);
						// parent cannot change
						// TODO user id
						// Update timestamp
						node.updatedAt = time;
						// Save and emit
						zone.save();
						socket.broadcast.emit('edit:node', {
							zoneId: zoneId,
							edit: {
								id: node.id,
								position: node.position,
								angle: node.angle,
								scale: node.scale/*,
								updatedBy: node.updatedBy*/
							},
							time: time
						});
						socket.emit('edit:node', {
							success: true,
							zoneId: zoneId,
							edit: {
								id: node.id,
								position: node.position,
								angle: node.angle,
								scale: node.scale/*,
								updatedBy: node.updatedBy*/
							},
							time: time
						});
						break;
					}
				}
			}
		});
	});

	socket.on('create:node', function(data) {
		const time = new Date().getTime();
		const zoneId = data.zoneId;
		var node = data.node;
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			if (zone) {
				// Validate/Assign unique id
				if (!node.id) {
					node.id = guid();
				}
				var idProcess = true;
				while (idProcess) {
					var isUnique = true;
					for (var i = 0; i < zone.nodes.length; ++i) {
						if (zone.nodes[i].id === node.id) {
							isUnique = false;
							break;
						}
					}
					if (isUnique) {
						idProcess = false;
					}
					else {
						node.id = guid();
					}
				}

				const index = zone.nodes.length;
				node.createdAt = time;
				node.updatedAt = time;
				// TODO user id
				zone.nodes.push(node);
				zone.save()
				.then(saved => {
					node = saved.nodes[index];
					socket.broadcast.emit('create:node', {
						zoneId: zoneId,
						node: node,
						time: time
					});
					socket.emit('create:node', {
						success: true,
						zoneId: zoneId,
						node: node,
						time: time
					});
				})
				.catch(error => {
					socket.emit('create:node', {
						success: false,
						error: error,
						zoneId: zoneId,
						node: node,
						time: time
					});
				});
			}
		});
	});
};
