const User = require('./app/user/user.model');
const Zone = require('./app/zone/zone.model');
const _    = require('lodash');

const MAXCONNECTION = 4;
var connections = 0;
var lockedNodes = {};

var userNames = (function() {

	var names = {};

	var join = function(name) {
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

	var leave = function(name) {
		connections--;
		if (names[name]) {
			delete names[name];
		}
	};

	return {
		join: join,
		leave: leave,
		get: get
	};
}());

// export function for listening to the socket
module.exports = function (socket) {
	const userId = socket.decoded_token._id;
	var username = '';
	// Fetch user infos
	User.findById(userId)
	.then(user => {
		username = user.username;
		userNames.join(username);

		var time = new Date().getTime();

		// send the new user their name and a list of users
		socket.emit('init', {
			name: username,
			users: userNames.get(),
			time: time
		});

		// notify other clients that a new user has joined
		socket.broadcast.emit('user:join', {
			name: username,
			time: time
		});
	});

	// broadcast a user's message to other users
	socket.on('send:message', function (data) {
		var time = new Date().getTime();
		socket.broadcast.emit('send:message', {
			user: username,
			text: data.message,
			time: time
		});
		socket.emit('send:message', {
			user: username,
			text: data.message,
			time: time
		});
	});

	// clean up when a user leaves, and broadcast it to other users
	socket.on('disconnect', function () {
		socket.broadcast.emit('user:left', {
			name: username,
			time: new Date().getTime()
		});
		userNames.leave(username);
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
							// Edit if node is not locked
							if (hasAccess(zone, localNode, userId)) {

								// _id and type cannot change
								// Update position
								localNode.position = _.extend(localNode.position, userNode.position);
								// Update angle
								localNode.angle = _.extend(localNode.angle, userNode.angle);
								// Update angle
								localNode.scale = _.extend(localNode.scale, userNode.scale);
								// parent cannot change
								// Update updatedBy
								localNode.updatedBy = userId;
								// Update timestamp
								localNode.updatedAt = time;

								// Prepare update
								updatedNodes.push(minifyNode(localNode));

							}
						}
					}

				});

				// Save and emit
				zone.save()
				.then(() => {

					socket.broadcast.emit('edit:nodes', {
						zoneId: zoneId,
						user: userId,
						nodes: updatedNodes,
						time: time
					});
					socket.emit('edited:nodes', {
						success: true,
						zoneId: zoneId,
						nodes: updatedNodes,
						time: time
					});

					// Log performance
					const end = new Date().getTime();
					console.log('edit:nodes', updatedNodes.length + ' nodes in ' + (end - time) + ' ms');

				})
				.catch(error => {
					socket.emit('edited:nodes', {
						success: false,
						error: error,
						zoneId: zoneId,
						nodes: userNodes,
						time: time
					});
				});

			} // If zone does not exist, abort

			socket.emit('edited:nodes', {
				success: false,
				message: 'Zone not found.',
				zoneId: zoneId,
				nodes: data.nodes,
				time: time
			});

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
					node.createdBy = userId;
					node.updatedBy = userId;

					zone.nodes.push(node);

				});

				// Save and emit
				zone.save()
				.then(saved => {

					// Return created nodes with simple structure
					const nodes = saved.nodes.slice(index).map(minifyNode);
					socket.broadcast.emit('create:nodes', {
						zoneId: zoneId,
						user: userId,
						nodes: nodes,
						time: time
					});
					socket.emit('created:nodes', {
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
					socket.emit('created:nodes', {
						success: false,
						error: error,
						zoneId: zoneId,
						nodes: nodes,
						time: time
					});
				});

			} // If zone does not exist, abort

			socket.emit('created:nodes', {
				success: false,
				message: 'Zone not found.',
				zoneId: zoneId,
				nodes: data.nodes,
				time: time
			});

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
							// Delete if node is not locked
							if (hasAccess(zone, localNode, userId)) {

								// Delete
								zone.nodes.splice(i, 1);

								// Delete and prepare update
								deletedNodes.push({ _id: localNode._id });

							}
						}
					}

				});

				// Save and emit
				zone.save()
				.then(() => {

					socket.broadcast.emit('delete:nodes', {
						zoneId: zoneId,
						user: userId,
						nodes: deletedNodes,
						time: time
					});
					socket.emit('deleted:nodes', {
						success: true,
						zoneId: zoneId,
						nodes: deletedNodes,
						time: time
					});

				// Log performance
				const end = new Date().getTime();
				console.log('delete:nodes', deletedNodes.length + ' nodes in ' + (end - time) + ' ms');

				})
				.catch(error => {
					socket.emit('deleted:nodes', {
						success: false,
						error: error,
						zoneId: zoneId,
						nodes: userNodes,
						time: time
					});
				});

			} // If zone does not exist, abort

			socket.emit('deleted:nodes', {
				success: false,
				message: 'Zone not found.',
				zoneId: zoneId,
				nodes: data.nodes,
				time: time
			});

		});
	});

	socket.on('lock:nodes', data => {
		const time = new Date().getTime();
		const zoneId = data.zoneId;

		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {

				const userNodes = data.nodes;
				const newLock = lockNodes(zone, userNodes, userId);

				// Save and emit
				socket.broadcast.emit('lock:nodes', {
					zoneId: zoneId,
					user: userId,
					nodes: newLock,
					time: time
				});
				socket.emit('locked:nodes', {
					success: true,
					zoneId: zoneId,
					nodes: newLock,
					time: time
				});

				// Log performance
				const end = new Date().getTime();
				console.log('lock:nodes', newLock.length + ' nodes in ' + (end - time) + ' ms');

			} // If zone does not exist, abort

			socket.emit('locked:nodes', {
				success: false,
				message: 'Zone not found.',
				zoneId: zoneId,
				nodes: data.nodes,
				time: time
			});

		});
	});

	socket.on('unlock:nodes', data => {
		const time = new Date().getTime();
		const zoneId = data.zoneId;

		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {

				const userNodes = data.nodes;
				const newUnlock = unlockNodes(zone, userNodes, userId);

				// Save and emit
				socket.broadcast.emit('unlock:nodes', {
					zoneId: zoneId,
					nodes: newUnlock,
					time: time
				});
				socket.emit('unlocked:nodes', {
					success: true,
					zoneId: zoneId,
					nodes: newUnlock,
					time: time
				});

				// Log performance
				const end = new Date().getTime();
				console.log('unlock:nodes', newUnlock.length + ' nodes in ' + (end - time) + ' ms');

			} // If zone does not exist, abort

			socket.emit('unlocked:nodes', {
				success: false,
				message: 'Zone not found.',
				zoneId: zoneId,
				nodes: data.nodes,
				time: time
			});

		});
	});

	socket.on('ping:position', data => {
		const time = new Date().getTime();
		const zoneId = data.zoneId;
		const position = {
			x: Number(data.position.x) || 0.0,
			y: Number(data.position.y) || 0.0,
			z: Number(data.position.z) || 0.0
		};

		socket.broadcast.emit('ping:position', {
			zoneId: zoneId,
			user: userId,
			position: position,
			time: time
		});
	});
};

var minifyNode = function(node) {
	return {
		_id: node._id,
		position: node.position,
		angle: node.angle,
		scale: node.scale,
		updatedBy: node.updatedBy
	};
};

var isNodeLocked = function(zone, node) {
	return !_.isEmpty(lockedNodes[zone._id]) &&
		   lockedNodes[zone._id][String(node._id)];
};

var isNodeOwner = function(zone, node, userId) {
	return !_.isEmpty(lockedNodes[zone._id]) &&
		   String(lockedNodes[zone._id][String(node._id)]) === String(userId);
};

var hasAccess = function(zone, node, userId) {
	return !isNodeLocked(zone, node) ||
		   isNodeOwner(zone, node, userId);
};

var lockNodes = function(zone, nodes, userId) {
	if (!lockedNodes[zone._id]) {
		lockedNodes[zone._id] = {};
	}
	var newLock = [];
	nodes.forEach(node => {
		if (!isNodeLocked(zone, node)) {
			lockedNodes[zone._id][String(node._id)] = String(userId);
			newLock.push({ _id: node._id });
		}
	});
	return newLock;
};

var unlockNodes = function(zone, nodes, userId) {
	if (!lockedNodes[zone._id]) {
		return;
	}
	var newUnlock = [];
	nodes.forEach(node => {
		if (isNodeLocked(zone, node) && isNodeOwner(zone, node, userId)) {
			delete lockedNodes[zone._id][String(node._id)];
			newUnlock.push({ _id: node._id });
		}
	});
	if (_.isEmpty(lockedNodes[zone._id])) {
		delete lockedNodes[zone._id];
	}
	return newUnlock;
};
