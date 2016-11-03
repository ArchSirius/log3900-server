const User = require('./app/user/user.model');
const Zone = require('./app/zone/zone.model');
const _    = require('lodash');

var lockedNodes = {};

const usersCtrl = (function() {

	var users = {};

	const join = function(user) {
		if (!user || users[String(user._id)]) {
			return false;
		}
		else {
			users[String(user._id)] = { username: user.username };
			return true;
		}
	};

	const getUser = function(userId) {
		return users[String(userId)];
	};

	const getZoneId = function(userId) {
		const user = users[String(userId)];
		if (user) {
			return user.zoneId;
		}
		return undefined;
	};

	const getUsers = function() {
		var res = [];
		for (user in users) {
			res.push({
				_id: users[user]._id,
				username: users[user].username
			});
		}
		return res;
	};

	const getNames = function() {
		var res = [];
		for (user in users) {
			res.push(users[user].username);
		}
		return res;
	};

	const leave = function(userId) {
		if (users[String(userId)]) {
			delete users[String(userId)];
		}
	};

	const registerZone = function(userId, zoneId) {
		if (users[String(userId)]) {
			users[String(userId)].zoneId = zoneId;
		}
	};

	const unregisterZone = function(userId, zoneId) {
		if (users[String(userId)]) {
			delete users[String(userId)].zoneId;
		}
	};

	return {
		join: join,
		leave: leave,
		getUser: getUser,
		getZoneId: getZoneId,
		getUsers: getUsers,
		getNames: getNames,
		registerZone: registerZone,
		unregisterZone: unregisterZone
	};
}());

// export function for listening to the socket
module.exports = function (socket) {
	const userId = socket.decoded_token._id;
	var username = '';
	// Fetch user infos
	User.findById(userId, '-salt -password')
	.then(user => {
		if (user) {
			username = user.username;
			usersCtrl.join(user);	// TODO handle return

			const time = new Date().getTime();

			// send the new user their name and a list of users
			socket.emit('init', {
				name: username,
				users: usersCtrl.getNames(),
				time: time
			});

			// notify other clients that a new user has joined
			socket.broadcast.emit('user:join', {
				name: username,
				time: time
			});
		}
		// If user does not exist, abort
		else {
			socket.close();
		}
	})
	// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
	.catch(error => {
		console.log('SERVER ERROR in constructor', error);
	});

	// broadcast a user's message to other users
	socket.on('send:message', function (data) {
		const time = new Date().getTime();
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
		const time = new Date().getTime();
		socket.broadcast.emit('user:left', {
			name: username,
			time: time
		});
		usersCtrl.leave(userId);
		const zoneId = usersCtrl.getZoneId(userId);
		if (zoneId) {
			socket.to(zoneId).emit('leave:zone', {
				userId: userId,
				time: time
			});
		}
	});


	socket.on('join:zone', data => {
		const time = new Date().getTime();
		const zoneId = data.zoneId;
		if (zoneId) {
			usersCtrl.registerZone(userId, zoneId);
			socket.join(zoneId);
			Zone.findById(zoneId, '-salt -password').exec()
			.then(zone => {
				if (zone) {
					socket.to(zoneId).emit('join:zone', {
						user: usersCtrl.getUser(userId),
						time: time
					});
					socket.emit('joined:zone', {
						success: true,
						zoneId: zoneId,
						time: time
					});
				}
				else {
					socket.emit('joined:zone', {
						success: false,
						message: 'Zone introuvable.',
						zoneId: zoneId,
						time: time
					});
				}
			})
			// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
			.catch(error => {
				socket.emit('joined:zone', {
					success: false,
					error: error,
					zoneId: zoneId,
					time: time
				});
				console.log('SERVER ERROR in join:zone', error);
			});
		}
		else {
			socket.emit('joined:zone', {
				success: false,
				message: 'zoneId manquant.',
				time: time
			});
		}
	});

	socket.on('leave:zone', () => {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);
		if (zoneId) {
			usersCtrl.unregisterZone(userId, zoneId);
			socket.to(zoneId).emit('leave:zone', {
				userId: userId,
				time: time
			});
			socket.emit('left:zone', {
				success: true,
				time: time
			});
			socket.leave(zoneId);
		}
		else {
			socket.emit('left:zone', {
				success: false,
				message: 'Aucune zone active.',
				time: time
			});
		}
	});

	socket.on('edit:nodes', data => {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);

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

					socket.to(zoneId).emit('edit:nodes', {
						userId: userId,
						nodes: updatedNodes,
						time: time
					});
					socket.emit('edited:nodes', {
						success: true,
						nodes: updatedNodes,
						time: time
					});

					// Log performance
					const end = new Date().getTime();
					console.log('edit:nodes', updatedNodes.length + ' nodes in ' + (end - time) + ' ms');

				})
				// Catch model validation erors
				.catch(error => {
					socket.emit('edited:nodes', {
						success: false,
						error: error,
						nodes: userNodes,
						time: time
					});
				});

			}
			// If zone does not exist, abort
			else {
				socket.emit('edited:nodes', {
					success: false,
					message: 'Zone introuvable.',
					nodes: data.nodes,
					time: time
				});
			}
		})
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		.catch(error => {
			socket.emit('edited:nodes', {
				success: false,
				error: error,
				nodes: data.nodes,
				time: time
			});
			console.log('SERVER ERROR in edit:nodes', error);
		});
	});

	socket.on('create:nodes', data => {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);

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
					socket.to(zoneId).emit('create:nodes', {
						userId: userId,
						nodes: nodes,
						time: time
					});
					socket.emit('created:nodes', {
						success: true,
						nodes: nodes,
						time: time
					});

					// Log performance
					const end = new Date().getTime();
					console.log('create:nodes', nodes.length + ' nodes in ' + (end - time) + ' ms');

				})
				// Catch model validation erors
				.catch(error => {
					socket.emit('created:nodes', {
						success: false,
						error: error,
						nodes: nodes,
						time: time
					});
				});

			}
			// If zone does not exist, abort
			else {
				socket.emit('created:nodes', {
					success: false,
					message: 'Zone introuvable.',
					nodes: data.nodes,
					time: time
				});
			}
		})
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		.catch(error => {
			socket.emit('created:nodes', {
				success: false,
				error: error,
				nodes: data.nodes,
				time: time
			});
			console.log('SERVER ERROR in create:nodes', error);
		});
	});

	socket.on('delete:nodes', data => {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);

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

					socket.to(zoneId).emit('delete:nodes', {
						userId: userId,
						nodes: deletedNodes,
						time: time
					});
					socket.emit('deleted:nodes', {
						success: true,
						nodes: deletedNodes,
						time: time
					});

				// Log performance
				const end = new Date().getTime();
				console.log('delete:nodes', deletedNodes.length + ' nodes in ' + (end - time) + ' ms');

				})
				// Catch model validation erors
				.catch(error => {
					socket.emit('deleted:nodes', {
						success: false,
						error: error,
						nodes: userNodes,
						time: time
					});
				});

			}
			// If zone does not exist, abort
			else {
				socket.emit('deleted:nodes', {
					success: false,
					message: 'Zone introuvable.',
					nodes: data.nodes,
					time: time
				});
			}
		})
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		.catch(error => {
			socket.emit('deleted:nodes', {
				success: false,
				error: error,
				nodes: data.nodes,
				time: time
			});
			console.log('SERVER ERROR in delete:nodes', error);
		});
	});

	socket.on('lock:nodes', data => {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);

		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {

				const userNodes = data.nodes;
				const newLock = lockNodes(zone, userNodes, userId);

				// Save and emit
				socket.to(zoneId).emit('lock:nodes', {
					userId: userId,
					nodes: newLock,
					time: time
				});
				socket.emit('locked:nodes', {
					success: true,
					nodes: newLock,
					time: time
				});

				// Log performance
				const end = new Date().getTime();
				console.log('lock:nodes', newLock.length + ' nodes in ' + (end - time) + ' ms');

			}
			// If zone does not exist, abort
			else {
				socket.emit('locked:nodes', {
					success: false,
					message: 'Zone introuvable.',
					nodes: data.nodes,
					time: time
				});
			}
		})
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		.catch(error => {
			socket.emit('locked:nodes', {
				success: false,
				error: error,
				nodes: data.nodes,
				time: time
			});
			console.log('SERVER ERROR in lock:nodes', error);
		});
	});

	socket.on('unlock:nodes', data => {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);

		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {

				const userNodes = data.nodes;
				const newUnlock = unlockNodes(zone, userNodes, userId);

				// Save and emit
				socket.to(zoneId).emit('unlock:nodes', {
					nodes: newUnlock,
					time: time
				});
				socket.emit('unlocked:nodes', {
					success: true,
					nodes: newUnlock,
					time: time
				});

				// Log performance
				const end = new Date().getTime();
				console.log('unlock:nodes', newUnlock.length + ' nodes in ' + (end - time) + ' ms');

			}
			// If zone does not exist, abort
			else {
				socket.emit('unlocked:nodes', {
					success: false,
					message: 'Zone introuvable.',
					nodes: data.nodes,
					time: time
				});
			}
		})
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		.catch(error => {
			socket.emit('unlocked:nodes', {
				success: false,
				error: error,
				nodes: data.nodes,
				time: time
			});
			console.log('SERVER ERROR in unlock:nodes', error);
		});
	});

	socket.on('ping:position', data => {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);
		const position = {
			x: Number(data.position.x) || 0.0,
			y: Number(data.position.y) || 0.0,
			z: Number(data.position.z) || 0.0
		};

		if (zoneId) {
			socket.to(zoneId).emit('ping:position', {
				userId: userId,
				position: position,
				time: time
			});
		}
	});
};

const minifyNode = function(node) {
	return {
		_id: node._id,
		position: node.position,
		angle: node.angle,
		scale: node.scale,
		updatedBy: node.updatedBy
	};
};

const isNodeLocked = function(zone, node) {
	return !_.isEmpty(lockedNodes[zone._id]) &&
		   lockedNodes[zone._id][String(node._id)];
};

const isNodeOwner = function(zone, node, userId) {
	return !_.isEmpty(lockedNodes[zone._id]) &&
		   String(lockedNodes[zone._id][String(node._id)]) === String(userId);
};

const hasAccess = function(zone, node, userId) {
	return !isNodeLocked(zone, node) ||
		   isNodeOwner(zone, node, userId);
};

const lockNodes = function(zone, nodes, userId) {
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

const unlockNodes = function(zone, nodes, userId) {
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
