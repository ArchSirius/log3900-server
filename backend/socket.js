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

	socket.on('edit:nodes', data => {
		const time = new Date().getTime();
		const zoneId = data.zoneId;

		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {

				const userNodes = data.nodes;
				var updatedNodes = [];
				// Iterate over user nodes
				userNodes.forEach(userNode => {

					var localNode;
					// Iterate over local nodes to find a match
					for (var i = 0; i < zone.nodes.length; ++i) {
						localNode = zone.nodes[i];
						// Find matching node
						if (String(localNode._id) === String(userNode._id)) {

							// _id and type cannot change
							// Update position
							localNode.position = _.extend(localNode.position, userNode.position);
							// Update angle
							localNode.angle = _.extend(localNode.angle, userNode.angle);
							// Update angle
							localNode.scale = _.extend(localNode.scale, userNode.scale);
							// parent cannot change
							// TODO user id
							// Update timestamp
							localNode.updatedAt = time;

							// Prepare update
							updatedNodes.push(minifyNode(localNode));

						}
					}

				});

				// Save and emit
				zone.save();
				socket.broadcast.emit('edit:nodes', {
					zoneId: zoneId,
					nodes: updatedNodes,
					time: time
				});
				socket.emit('edit:nodes', {
					success: true,
					zoneId: zoneId,
					nodes: updatedNodes,
					time: time
				});

				// Log performance
				const end = new Date().getTime();
				console.log('edit:nodes', updatedNodes.length + ' nodes in ' + (end - time) + ' ms');

			} // If zone does not exist, abort
		});
	});

	socket.on('create:nodes', data => {
		const time = new Date().getTime();
		const zoneId = data.zoneId;

		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {

				const index = zone.nodes.length;
				const userNodes = data.nodes;
				// Iterate over user nodes
				userNodes.forEach(node => {

					node.createdAt = time;
					node.updatedAt = time;
					// TODO user id

					zone.nodes.push(node);

				});

				// Save and emit
				zone.save()
				.then(saved => {
					// Return created nodes with simple structure
					const nodes = saved.nodes.slice(index).map(minifyNode);
					socket.broadcast.emit('create:nodes', {
						zoneId: zoneId,
						nodes: nodes,
						time: time
					});
					socket.emit('create:nodes', {
						success: true,
						zoneId: zoneId,
						nodes: nodes,
						time: time
					});

					// Log performance
					const end = new Date().getTime();
					console.log('create:nodes', nodes.length + ' nodes in ' + (end - time) + ' ms');

				})
				.catch(error => {
					socket.emit('create:nodes', {
						success: false,
						error: error,
						zoneId: zoneId,
						nodes: nodes,
						time: time
					});
				});

			} // If zone does not exist, abort
		});
	});

	socket.on('delete:nodes', data => {
		const time = new Date().getTime();
		const zoneId = data.zoneId;

		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {

				const userNodes = data.nodes;
				var deletedNodes = [];
				// Iterate over user nodes
				userNodes.forEach(userNode => {

					var localNode;
					// Iterate over local nodes to find a match
					for (var i = 0; i < zone.nodes.length; ++i) {
						localNode = zone.nodes[i];
						// Find matching node
						if (String(localNode._id) === String(userNode._id)) {

							// Delete
							zone.nodes.splice(i, 1);

							// Delete and prepare update
							deletedNodes.push({ _id: localNode._id });

						}
					}

				});

				// Save and emit
				zone.save();
				socket.broadcast.emit('delete:nodes', {
					zoneId: zoneId,
					nodes: deletedNodes,
					time: time
				});
				socket.emit('delete:nodes', {
					success: true,
					zoneId: zoneId,
					nodes: deletedNodes,
					time: time
				});

				// Log performance
				const end = new Date().getTime();
				console.log('delete:nodes', deletedNodes.length + ' nodes in ' + (end - time) + ' ms');

			} // If zone does not exist, abort
		});
	});
};

var minifyNode = function(node) {
	return {
		_id: node._id,
		position: node.position,
		angle: node.angle,
		scale: node.scale/*,
		updatedBy: node.updatedBy*/
	};
};
