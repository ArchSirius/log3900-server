/**
 * Contains the connected users and their active zone, if any.
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
 * @returns {Object[]} user sockets.
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
 * @returns {Object} user socket.
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
