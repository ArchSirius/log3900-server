const Zone      = require('../app/zone/zone.model');
const _         = require('lodash');
const usersCtrl = require('./socket.users.controller');
const lockCtrl  = require('./socket.lock.controller');

module.exports = function(socket) {

	/**
	 * The _id of the user in this socket.
	 * @private
	 */
	const userId = socket.decoded_token._id;

	/**
	 * The list of this socket's rooms.
	 * @private
	 */
	const chatrooms = [];

	/**
	 * Constructs basic user informations needed for the controllers and send basic data to user with event 'init'.
	 * @param {Object} user - The user to own the socket.
	 * @param {string} user._id - The unique _id of a user.
	 * @param {string} user.username - The username of a user.
	 */
	const onInit = function(user) {
		const time = new Date().getTime();
		usersCtrl.join(socket, user);
		socket.emit('init', {
			user: {
				userId: userId,
				username: user.username
			},
			time: time
		});
	};

	/**
	 * Disconnect a user and send notifications in socket rooms with events 'user:left' and 'leave:zone'.
	 */
	const disconnect = function() {
		const time = new Date().getTime();
		const isDeleted = usersCtrl.leave(socket, userId); // TODO use isDeleted to manage disconnects
		leaveZone();
		chatrooms.forEach(room => {
			socket.broadcast.to(room).emit('user:left', {
				userId: userId,
				time: time
			});
		});
	};

	/**
	 * Join a chatroom, send notification in socket room with event 'user:join'.
	 * Sends feedback to caller with event 'joined:chatroom'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.room - The room to join.
	 */
	const joinChatroom = function(data) {
		const time = new Date().getTime();
		const room = data.room;
		if (room && chatrooms.indexOf(room) === -1) {
			socket.join(room);
			chatrooms.push(room);
			socket.broadcast.to(room).emit('user:join', {
				user: usersCtrl.getUser(userId),
				time: time
			});
			socket.emit('joined:chatroom', {
				success: true,
				room: room,
				users: usersCtrl.getNames(),
				time: time
			});
		}
		else {
			socket.emit('joined:chatroom', {
				success: false,
				message: 'Vous êtes déjà dans ce canal.',
				room: room,
				users: usersCtrl.getNames(),
				time: time
			});
		}
	};

	/**
	 * Leave a chatroom, send notification in socket room with event 'user:left'.
	 * Sends feedback to caller with event 'left:chatroom'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.room - The room to leave.
	 */
	const leaveChatroom = function(data) {
		const time = new Date().getTime();
		const room = data.room;
		const index = chatrooms.indexOf(room);
		if (room && index !== -1) {
			socket.leave(room);
			chatrooms.splice(index, 1);
			socket.broadcast.to(room).emit('user:left', {
				userId: userId,
				time: time
			});
			socket.emit('left:chatroom', {
				success: true,
				room: room,
				time: time
			});
		}
		else {
			socket.emit('left:chatroom', {
				success: false,
				message: 'Vous n\'êtes pas dans ce canal.',
				room: room,
				time: time
			});
		}
	};

	/**
	 * Send message in socket room with event 'send:message'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.room - The room to broadcast in.
	 * @param {string} data.message - The message to send.
	 */
	const sendMessage = function(data) {
		const time = new Date().getTime();
		const room = data.room;
		if (room) {
			socket.broadcast.to(room).emit('send:message', {
				userId: userId,
				text: data.message,
				time: time
			});
			socket.emit('send:message', {
				userId: userId,
				text: data.message,
				time: time
			});
		}
	};

	/**
	 * Set a user's active zone, make it join the zone's socket room, send notification in socket room with event 'join:zone'.
	 * Sends feedback to caller with event 'joined:zone'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.zoneId - The unique _id of a zone.
	 */
	const joinZone = function(data) {
		const time = new Date().getTime();
		const zoneId = data.zoneId;
		if (zoneId) {
			usersCtrl.registerZone(userId, zoneId);
			socket.join(zoneId);
			Zone.findById(zoneId, '-salt -password').exec()
			.then(zone => {
				if (zone) {
					socket.broadcast.to(zoneId).emit('join:zone', {
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
	};

	/**
	 * Remove a user's active zone, make it leave the zone's socket room, send notification in socket room with event 'leave:zone'.
	 * Sends feedback to caller with event 'left:zone'.
	 */
	const leaveZone = function() {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);
		if (zoneId) {
			usersCtrl.unregisterZone(userId, zoneId);
			socket.broadcast.to(zoneId).emit('leave:zone', {
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
	};

	/**
	 * Edit a zone's nodes and send request in socket room with event 'edit:nodes'.
	 * Sends feedback to caller with event 'edited:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to edit.
	 * @param {string} data.nodes[]._id - The unique _id of a node.
	 * @param {Object} [data.nodes[].position] - The position {x, y, z} of a node.
	 * @param {number} [data.nodes[].angle] - The angle of a node.
	 * @param {Object} [data.nodes[].scale] - The scale {x, y, z} of a node.
	 */
	const editNodes = function(data) {
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
							if (lockCtrl.hasAccess(zone, localNode, userId)) {

								// _id and type cannot change
								// Update position
								localNode.position = _.extend(localNode.position, userNode.position);
								// Update angle
								if (userNode.angle) {
									localNode.angle = userNode.angle;
								}
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

					socket.broadcast.to(zoneId).emit('edit:nodes', {
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
	};

	/**
	 * Create new nodes in a zone and send request in socket room with event 'create:nodes'.
	 * Sends feedback to caller with event 'created:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to edit.
	 * @param {string} data.nodes[].type - The type of a node.
	 * @param {Object} [data.nodes[].position] - The position {x, y, z} of a node.
	 * @param {number} [data.nodes[].angle] - The angle of a node.
	 * @param {Object} [data.nodes[].scale] - The scale {x, y, z} of a node.
	 * @param {string} [data.nodes[].parent] - The unique _id of a node's parent.
	 * @param {string} [data.nodes[].localId] - The unique client's local id of a node.
	 */
	const createNodes = function(data) {
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
					var nodes = saved.nodes.slice(index).map(minifyNode);
					// Send back localId
					nodes.forEach((node, nIndex) => {
						node.localId = userNodes[nIndex].localId;
					});
					socket.broadcast.to(zoneId).emit('create:nodes', {
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
						nodes: userNodes,
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
	};

	/**
	 * Delete a zone's nodes and send request in socket room with event 'delete:nodes'.
	 * Sends feedback to caller with event 'deleted:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to delete.
	 * @param {string} data.nodes[]._id - The unique _id of a node.
	 */
	const deleteNodes = function(data) {
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
							if (lockCtrl.hasAccess(zone, localNode, userId)) {

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

					socket.broadcast.to(zoneId).emit('delete:nodes', {
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
	};

	/**
	 * Lock a zone's nodes and send request in socket room with event 'lock:nodes'.
	 * Sends feedback to caller with event 'locked:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to lock.
	 * @param {string} nodes[]._id - The unique _id of a node.
	 */
	const lockNodes = function(data) {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);
		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {
				const userNodes = data.nodes;
				const newLock = lockCtrl.lockNodes(zone, userNodes, userId);
				// Save and emit
				socket.broadcast.to(zoneId).emit('lock:nodes', {
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
	};

	/**
	 * Unlock a zone's nodes and send request in socket room with event 'unlock:nodes'.
	 * Sends feedback to caller with event 'unlocked:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to unlock.
	 * @param {string} nodes[]._id - The unique _id of a node.
	 */
	const unlockNodes = function(data) {
		const time = new Date().getTime();
		const zoneId = usersCtrl.getZoneId(userId);
		// Find the edited zone
		Zone.findById(zoneId, '-salt -password').exec()
		.then(zone => {
			// Apply changes if zone exists
			if (zone) {
				const userNodes = data.nodes;
				const newUnlock = lockCtrl.unlockNodes(zone, userNodes, userId);
				// Save and emit
				socket.broadcast.to(zoneId).emit('unlock:nodes', {
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
	};

	/**
	 * Ping a position in a zone and send request in socket room with event 'ping:position'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object} [data.position] - The position {x, y, z} to ping.
	 */
	const pingPosition = function(data) {
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
	};

	/**
	 * Minify a node to remove unnecessary properties.
	 * @private
	 * @param {Object} node - The node to minify.
	 * @returns {Object} Minified node.
	 */
	const minifyNode = function(node) {
		return {
			_id: node._id,
			position: node.position,
			angle: node.angle,
			scale: node.scale,
			updatedBy: node.updatedBy
		};
	};

	return {
		onInit: onInit,
		disconnect: disconnect,
		joinChatroom: joinChatroom,
		leaveChatroom: leaveChatroom,
		sendMessage: sendMessage,
		joinZone: joinZone,
		leaveZone: leaveZone,
		editNodes: editNodes,
		createNodes: createNodes,
		deleteNodes: deleteNodes,
		lockNodes: lockNodes,
		unlockNodes: unlockNodes,
		pingPosition: pingPosition
	};
};
