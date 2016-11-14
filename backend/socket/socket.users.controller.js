/**
 * Contains the connected users and their active zone and chatrooms, if any.
 * @private
 */
var users = {};

/**
 * Add a user if it is not already connected, a socket if it is new.
 * @param {Object} socket - The user's socket.
 * @param {Object} user - The user to add.
 * @param {string} user._id - The unique _id of a user.
 * @param {string} user.username - The username of a user.
 * @returns {boolean} true if the user is new
 */
exports.join = function(socket, user) {
	if (users[String(user._id)]) {
		if (!this.getSocket(user._id, socket.id)) {
			users[String(user._id)].sockets.push(socket);
		}
		return false;
	}
	users[String(user._id)] = {
		username: user.username,
		sockets: [ socket ]
	};
	return true;
};

/**
 * Return a user's details.
 * @param {string} userId - The unique _id of a user.
 * @returns {Object} A user.
 */
exports.getUser = function(userId) {
	const user = users[String(userId)];
	return {
		userId: user._id,
		username: user.username
	};
};

/**
 * Return a user's active zone _id, if any.
 * @param {string} userId - The unique _id of a user.
 * @returns {string} A user's active zone _id.
 */
exports.getZoneId = function(userId) {
	const user = users[String(userId)];
	if (user) {
		return user.zoneId;
	}
	return undefined;
};

/**
 * Return all connected users.
 * @deprecated since 14-11-16
 * @returns {Object[]} Connected users.
 */
exports.getUsers = function() {
	var res = [];
	for (user in users) {
		res.push({
			_id: users[user]._id,
			username: users[user].username
		});
	}
	return res;
};

/**
 * Return all users connected in a zone.
 * @param {string} zoneId - The unique _id of a zone.
 * @returns {Object[]} Connected users.
 */
exports.getZoneUsers = function(zoneId) {
	var res = [];
	for (user in users) {
		if (users[user].zoneId === zoneId) {
			res.push({
				_id: users[user]._id,
				username: users[user].username
			});
		}
	}
	return res;
};

/**
 * Return all connected users' usernames.
 * @deprecated since 14-11-16
 * @returns {string[]} Connected users' usernames.
 */
exports.getNames = function() {
	var res = [];
	for (user in users) {
		res.push(users[user].username);
	}
	return res;
};

/**
 * Remove a user socket if it is connected, the user if no sockets are left.
 * @param {Object} socket - The user's socket.
 * @param {string} userId - The unique _id of a user.
 * @param {boolean} true if user has no sockets left, false otherwise.
 */
exports.leave = function(socket, userId) {
	if (users[String(userId)]) {
		for (var i = 0; i < users[String(userId)].sockets.length; ++i) {
			if (users[String(userId)].sockets[i].id === socket.id) {
				users[String(userId)].sockets.splice(i, 1);
			}
		}
		if (users[String(userId)].sockets.length === 0) {
			delete users[String(userId)];
			return true;
		}
	}
	return false;
};

/**
 * Set a user's active zone.
 * @param {string} userId - The unique _id of a user.
 * @param {string} zoneId - The unique _id of a zone.
 */
exports.registerZone = function(userId, zoneId) {
	if (users[String(userId)]) {
		users[String(userId)].zoneId = zoneId;
	}
};

/**
 * Remove a user's active zone.
 * @param {string} userId - The unique _id of a user.
 * @param {string} zoneId - The unique _id of a zone.
 */
exports.unregisterZone = function(userId, zoneId) {
	if (users[String(userId)]) {
		delete users[String(userId)].zoneId;
	}
};

/**
 * Return all user sockets.
 * @param {string} userId - The unique _id of a user.
 * @returns {Object[]} User sockets.
 */
exports.getSockets = function(userId) {
	const user = users[String(userId)];
	if (user) {
		return user.sockets;
	}
	return undefined;
};

/**
 * Return a single user socket.
 * @param {string} userId - The unique _id of a user.
 * @param {string} socketId - The socket id.
 * @returns {Object} User socket.
 */
exports.getSocket = function(userId, socketId) {
	const sockets = this.getSockets(userId);
	for (var i = 0; i < sockets.length; ++i) {
		if (sockets[i].id === socketId) {
			return sockets[i];
		}
	}
	return undefined;
};

/**
 * Add a user in a chatroom.
 * @param {string} userId - The unique _id of a user.
 * @param {string} room - The chatroom.
 * @param {Boolean} Success.
 */
exports.joinChatroom = function(userId, room) {
	if (users[String(userId)]) {
		if (!users[String(userId)].rooms) {
			users[String(userId)].rooms = [];
		}
		if (users[String(userId)].rooms.indexOf() === -1) {
			users[String(userId)].rooms.push(room);
			return true;
		}
	}
	return false;
};

/**
 * Remove a user from a chatroom.
 * @param {string} userId - The unique _id of a user.
 * @param {string} room - The chatroom.
 * @param {Boolean} Success.
 */
exports.leaveChatroom = function(userId, room) {
	if (users[String(userId)] && users[String(userId)].rooms) {
		const i = users[String(userId)].rooms.indexOf(room);
		if (i !== -1) {
			users[String(userId)].rooms.splice(i, 1);
			return true;
		}
	}
	return false;
};

/**
 * Return all user chatrooms.
 * @param {string} userId - The unique _id of a user.
 * @returns {Object[]} User chatrooms.
 */
exports.getChatrooms = function(userId) {
	const user = users[String(userId)];
	if (user && user.rooms) {
		return user.rooms;
	}
	return [];
};

/**
 * Return all users connected in a chatroom.
 * @param {string} room - The room.
 * @returns {Object[]} Connected users.
 */
exports.getChatroomUsers = function(room) {
	var res = [];
	for (user in users) {
		if (users[user].rooms.indexOf(room) !== -1) {
			res.push({
				_id: users[user]._id,
				username: users[user].username
			});
		}
	}
	return res;
};
