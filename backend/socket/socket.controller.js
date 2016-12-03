const User    = require('../app/user/user.model');
const Node    = require('../app/node/node.model');
const Zone    = require('../app/zone/zone.model');
const _       = require('lodash');
const msgCtrl = require('./socket.message.controller');

module.exports = function(socket) {

	/**
	 * The _id of the user in this socket.
	 * @private
	 */
	const userId = socket.decoded_token._id;

	/**
	 * Temporary information about the user session.
	 * @private
	 */
	var tmp = {};

	/**
	 * Constructs basic user informations needed for the controllers and send basic data to user with event 'init'.
	 * @param {Object} user - The user to own the socket.
	 * @param {string} user._id - The unique _id of a user.
	 * @param {string} user.username - The username of a user.
	 */
	const onInit = function(usersCtrl, user) {
		const time = new Date().getTime();
		usersCtrl.join(socket, user);
		socket.emit('init', {
			user: usersCtrl.getUser(userId),
			time: time
		});
		try {
			msgCtrl.fetchPendingMessages(userId, pendingMessages => {
				if (pendingMessages && pendingMessages.messages) {
					pendingMessages.messages.forEach(message => {
						msgCtrl.emitMessage(message.createdBy._id, userId, message.text);
					});
				}
			});
		}
		catch (error) {
			// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
			console.log('SERVER ERROR in init - fetchPendingMessages', error);
		}
	};

	/**
	 * Enable or disable chat functions for a socket.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {boolean} [data.value=true] The value to set.
	 */
	const initChat = function(usersCtrl) {
		return function (data) {
			var value = true;
			if (data && data.hasOwnProperty('value')) {
				value = data.value;
			}
			usersCtrl.setChat(socket, userId, value);
		};
	};

	/**
	 * Disconnect a user and send notifications in socket rooms with events 'user:left' and 'leave:zone'.
	 */
	const disconnect = function(usersCtrl) {
		return function () {
			const time = new Date().getTime();
			const isDeleted = usersCtrl.leave(socket, userId);
			if (isDeleted) {
				leaveZone(usersCtrl)();
				const chatrooms = usersCtrl.getChatrooms(userId);
				chatrooms.forEach(room => {
					socket.broadcast.to(room).emit('user:left', {
						user: usersCtrl.getUser(userId),
						time: time
					});
				});
			}
		};
	};

	/**
	 * Join a chatroom, send notification in socket room with event 'user:join'.
	 * Sends feedback to caller with event 'joined:chatroom'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.room - The room to join.
	 */
	const joinChatroom = function(usersCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const room = data.room;
			if (room && usersCtrl.joinChatroom(userId, room)) {
				socket.join(room);
				msgCtrl.fetchGroupMessages(room, messages => {
					socket.broadcast.to(room).emit('user:join', {
						room: room,
						user: usersCtrl.getUser(userId),
						time: time
					});
					socket.emit('joined:chatroom', {
						success: true,
						room: room,
						users: usersCtrl.getChatroomUsers(room),
						messages: messages,
						time: time
					});
				});
			}
			else {
				socket.emit('joined:chatroom', {
					success: false,
					message: 'Vous êtes déjà dans ce canal.',
					room: room,
					users: usersCtrl.getChatroomUsers(room),
					time: time
				});
			}
		};
	};

	/**
	 * Leave a chatroom, send notification in socket room with event 'user:left'.
	 * Sends feedback to caller with event 'left:chatroom'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.room - The room to leave.
	 */
	const leaveChatroom = function(usersCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const room = data.room;
			if (room && usersCtrl.leaveChatroom(userId, room)) {
				socket.leave(room);
				socket.broadcast.to(room).emit('user:left', {
					user: usersCtrl.getUser(userId),
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
	};

	/**
	 * Send a group message to a room with event 'send:group:message'.
	 * Sends the message back to caller on success.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.to - The target user to receive the message.
	 * @param {string} data.text - The message to send.
	 */
	const sendGroupMessage = function(usersCtrl) {
		return function (data) {
			const room = data.to;
			const text = data.text;
			if (room) {
				try {
					msgCtrl.sendGroupMessage(usersCtrl, userId, socket, room, text);
					socket.emit('send:group:message', {
						from: usersCtrl.getUser(userId),
						room: room,
						text: text,
						time: new Date().getTime()
					});
				}
				catch (error) {
					// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
					console.log('SERVER ERROR in send:group:message', error);
				}
			}
		};
	};

	/**
	 * Send a private message to a user with event 'send:private:message'.
	 * Sends the message back to caller on success.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.to - The target user to receive the message.
	 * @param {string} data.text - The message to send.
	 */
	const sendPrivateMessage = function(usersCtrl) {
		return function (data) {
			const to = data.to;
			const text = data.text;
			const sendFeedback = function(recipient) {
				socket.emit('send:private:message', {
					from: usersCtrl.getUser(userId),
					to: recipient,
					text: text,
					time: new Date().getTime()
				});
			};
			try {
				msgCtrl.sendPrivateMessage(usersCtrl, userId, to, text);
				const recipient = usersCtrl.getUser(to);
				if (recipient) {
					sendFeedback(recipient);
				}
				else {
					usersCtrl.getUserAsync(to, user => {
						sendFeedback(user);
					});
				}
			}
			catch (error) {
				// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
				console.log('SERVER ERROR in send:private:message', error);
			}
		};
	};

	/**
	 * Fetch a private conversation's latest messages and send with event 'get:private:messages'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.userId - The other user _id in the conversation.
	 */
	const getPrivateMessages = function(data) {
		msgCtrl.fetchPrivateMessages(userId, data.userId, messages => {
			socket.emit('get:private:messages', {
				success: true,
				messages: messages,
				time: new Date().getTime()
			});
		});
	};

	/**
	 * Send message in socket room with event 'send:message'.
	 * @deprecated since 14-11-16
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.room - The room to broadcast in.
	 * @param {string} data.message - The message to send.
	 */
	const sendMessage = function(usersCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const room = data.room;
			if (room) {
				socket.broadcast.to(room).emit('send:message', {
					user: usersCtrl.getUser(userId),
					room: room,
					text: data.message,
					time: time
				});
				socket.emit('send:message', {
					user: usersCtrl.getUser(userId),
					room: room,
					text: data.message,
					time: time
				});
			}
		};
	};

	/**
	 * Set a user's active zone, make it join the zone's socket room, send notification in socket room with event 'join:zone'.
	 * Sends feedback to caller with event 'joined:zone'.
	 * Tries to assign a starting point to the caller and send with 'assign:startpoint' and 'assigned:startpoint'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {string} data.zoneId - The unique _id of a zone.
	 * @param {boolean} [data.assignStartpoint=false] - Whether to assign try to assign a startpoint or not.
	 * @param {string} [data.password] - The zone's password if needed.
	 */
	const joinZone = function(usersCtrl, lockCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const zoneId = data.zoneId;
			if (zoneId) {
				Zone.findById(zoneId).populate('nodes').exec()
				.then(zone => {
					if (zone) {
						if (zone.private && !zone.authenticate(data.password)) {
							socket.emit('joined:zone', {
								success: false,
								message: 'Accès refusé.',
								zoneId: zoneId,
								time: time
							});
						}
						else {
							zone.salt = undefined;
							zone.password = undefined;
							usersCtrl.registerZone(userId, zoneId);
							socket.join(zoneId);
							socket.broadcast.to(zoneId).emit('join:zone', {
								user: usersCtrl.getUser(userId),
								time: time
							});
							socket.emit('joined:zone', {
								success: true,
								zoneId: zoneId,
								data: {
									users: usersCtrl.getZoneUsers(zoneId),
									nodes: zone.nodes,
									lockedNodes: lockCtrl.getZoneLocks(zoneId),
									assignedStartpoints: lockCtrl.getAssignedStartpoints(zoneId)
								},
								time: time
							});
							if (data.assignStartpoint) {
								const assignedStartpoint = lockCtrl.tryAssignUserStartpoint(zone, userId);
								if (assignedStartpoint) {
									socket.broadcast.to(zoneId).emit('assign:startpoint', {
										user: usersCtrl.getUser(userId),
										nodeId: assignedStartpoint,
										time: time
									});
									socket.emit('assigned:startpoint', {
										success: true,
										nodeId: assignedStartpoint,
										time: time
									});
								}
							}
							joinChatroom(usersCtrl)({ room: zoneId });
						}
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
	};

	/**
	 * Remove a user's active zone, make it leave the zone's socket room, send notification in socket room with event 'leave:zone'.
	 * Sends feedback to caller with event 'left:zone'.
	 * Unassign starting point if needed and send 'unassign:startpoint'.
	 */
	const leaveZone = function(usersCtrl, lockCtrl) {
		return function () {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);
			if (zoneId) {
				usersCtrl.unregisterZone(userId, zoneId);
				usersCtrl.leaveChatroom(userId, zoneId);
				socket.broadcast.to(zoneId).emit('leave:zone', {
					user: usersCtrl.getUser(userId),
					time: time
				});
				socket.emit('left:zone', {
					success: true,
					time: time
				});
				const nodeId = lockCtrl.unassignUserStartpoint(zoneId, userId);
				if (nodeId) {
					socket.broadcast.to(zoneId).emit('unassign:startpoint', {
						user: usersCtrl.getUser(userId),
						nodeId: nodeId,
						time: time
					});
				}
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
	const editNodes = function(usersCtrl, lockCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);

			// Find the edited zone
			Zone.findById(zoneId, '-salt -password').populate('nodes').exec()
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
									updatedNodes.push(minifyNodeStrict(localNode));

								}
							}
						}

					});

					// Save and emit
					zone.save()
					.then(() => {

						socket.broadcast.to(zoneId).emit('edit:nodes', {
							user: usersCtrl.getUser(userId),
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
	const createNodes = function(usersCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);

			// Find the edited zone
			Zone.findById(zoneId, '-salt -password').populate('nodes').exec()
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
						var nodes = saved.nodes.slice(index).map(minifyNodeSoft);
						// Send back localId
						nodes.forEach((node, nIndex) => {
							node.localId = userNodes[nIndex].localId;
						});
						socket.broadcast.to(zoneId).emit('create:nodes', {
							user: usersCtrl.getUser(userId),
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
	};

	/**
	 * Delete a zone's nodes and send request in socket room with event 'delete:nodes'.
	 * Sends feedback to caller with event 'deleted:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to delete.
	 * @param {string} data.nodes[]._id - The unique _id of a node.
	 */
	const deleteNodes = function(usersCtrl, lockCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);

			// Find the edited zone
			Zone.findById(zoneId, '-salt -password').populate('nodes').exec()
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
							user: usersCtrl.getUser(userId),
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
	};

	/**
	 * Lock a zone's nodes and send request in socket room with event 'lock:nodes'.
	 * Sends feedback to caller with event 'locked:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to lock.
	 * @param {string} nodes[]._id - The unique _id of a node.
	 */
	const lockNodes = function(usersCtrl, lockCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);
			// Find the edited zone
			Zone.findById(zoneId, '-salt -password').populate('nodes').exec()
			.then(zone => {
				// Apply changes if zone exists
				if (zone) {
					const userNodes = data.nodes;
					const newLock = lockCtrl.lockNodes(zone, userNodes, userId);
					// Save and emit
					socket.broadcast.to(zoneId).emit('lock:nodes', {
						user: usersCtrl.getUser(userId),
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
	};

	/**
	 * Unlock a zone's nodes and send request in socket room with event 'unlock:nodes'.
	 * Sends feedback to caller with event 'unlocked:nodes'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object[]} data.nodes - The nodes to unlock.
	 * @param {string} nodes[]._id - The unique _id of a node.
	 */
	const unlockNodes = function(usersCtrl, lockCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);
			// Find the edited zone
			Zone.findById(zoneId, '-salt -password').populate('nodes').exec()
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
	};

	/**
	 * Ping a position in a zone and send request in socket room with event 'ping:position'.
	 * @param {Object} data - The data received from the caller in JSON form.
	 * @param {Object} [data.position] - The position {x, y, z} to ping.
	 */
	const pingPosition = function(usersCtrl) {
		return function (data) {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);
			const position = {
				x: Number(data.position.x) || 0.0,
				y: Number(data.position.y) || 0.0,
				z: Number(data.position.z) || 0.0
			};

			if (zoneId) {
				socket.to(zoneId).emit('ping:position', {
					user: usersCtrl.getUser(userId),
					position: position,
					time: time
				});
			}
		};
	};

	/**
	 * Start a simulation and send request in socket room with event 'start:simulation'.
	 */
	const startSimulation = function(usersCtrl) {
		return function () {
			const time = new Date().getTime();
			socket.broadcast.to(usersCtrl.getZoneId(userId)).emit('start:simulation', {
				user: usersCtrl.getUser(userId),
				time: time
			});
			tmp.simulation = { start: time };
		};
	};

	/**
	 * End a simulation and send request in socket room with event 'end:simulation'.
	 */
	const endSimulation = function(usersCtrl) {
		return function () {
			const time = new Date().getTime();
			const zoneId = usersCtrl.getZoneId(userId);

			socket.broadcast.to(usersCtrl.getZoneId(userId)).emit('end:simulation', {
				user: usersCtrl.getUser(userId),
				time: time
			});
			if (!tmp.simulation || !tmp.simulation.start) {
				return;
			}
			const simulationTime = (time - tmp.simulation.start) / 1000;
			Zone.findById(zoneId, '-salt -password').populate('nodes').exec()
			.then(zone => {
				if (!zone) {
					return;
				}
				zone.stats.playedGames++;
				zone.stats.playedTime += simulationTime;
			})
			// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
			.catch(error => {
				console.log('SERVER ERROR in endSimulation', error);
			});
			User.findById(userId, '-salt -password').exec()
			.then(user => {
				user.stats.playedGames++;
				user.stats.playedTime += simulationTime;
			})
			// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
			.catch(error => {
				console.log('SERVER ERROR in endSimulation', error);
			});
		};
	};

	/**
	 * Minify a node to remove all unnecessary properties.
	 * @private
	 * @param {Object} node - The node to minify.
	 * @returns {Object} Minified node.
	 */
	const minifyNodeStrict = function(node) {
		return {
			_id: node._id,
			position: node.position,
			angle: node.angle,
			scale: node.scale,
			updatedBy: node.updatedBy
		};
	};

	/**
	 * Minify a node to remove a few unnecessary properties.
	 * @private
	 * @param {Object} node - The node to minify.
	 * @returns {Object} Minified node.
	 */
	const minifyNodeSoft = function(node) {
		return {
			_id: node._id,
			type: node.type,
			position: node.position,
			angle: node.angle,
			scale: node.scale,
			parent: node.parent,
			createdAt: node.createdAt,
			updatedAt: node.updatedAt,
			createdBy: node.createdBy,
			updatedBy: node.updatedBy
		};
	};

	return {
		onInit: onInit,
		initChat: initChat,
		disconnect: disconnect,
		joinChatroom: joinChatroom,
		leaveChatroom: leaveChatroom,
		sendGroupMessage: sendGroupMessage,
		sendPrivateMessage: sendPrivateMessage,
		getPrivateMessages: getPrivateMessages,
		sendMessage: sendMessage,
		joinZone: joinZone,
		leaveZone: leaveZone,
		editNodes: editNodes,
		createNodes: createNodes,
		deleteNodes: deleteNodes,
		lockNodes: lockNodes,
		unlockNodes: unlockNodes,
		startSimulation: startSimulation,
		endSimulation: endSimulation,
		pingPosition: pingPosition
	};
};
