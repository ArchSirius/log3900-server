/**
 * Contains the connected users and their active zone, if any.
 * @private
 */
var users = {};

/**
 * Add a user if it is not already connected.
 * @param {Object} user - The user to add.
 * @param {string} user._id - The unique _id of a user.
 * @param {string} user.username - The username of a user.
 * @returns {boolean} Success status.
 */
exports.join = function(user) {
	if (!user || users[String(user._id)]) {
		return false;
	}
	else {
		users[String(user._id)] = { username: user.username };
		return true;
	}
};

/**
 * Return a user's details.
 * @param {string} userId - The unique _id of a user.
 * @returns {Object} A user.
 */
exports.getUser = function(userId) {
	return users[String(userId)];
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
 * Remove a user if it is connected.
 * @param {string} userId - The unique _id of a user.
 */
exports.leave = function(userId) {
	if (users[String(userId)]) {
		delete users[String(userId)];
	}
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
